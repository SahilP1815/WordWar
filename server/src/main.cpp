/*
 * Think & Type — C++ WebSocket Game Server
 * Built with Crow (header-only HTTP/WS framework) + nlohmann/json
 *
 * Protocol: plain JSON over WebSocket (frontend uses native WebSocket API)
 *
 * Client → Server messages:
 *   { "type": "room:create",   "hostName": "..." }
 *   { "type": "room:join",     "roomId": "...", "playerName": "..." }
 *   { "type": "round:start",   "roomId": "..." }
 *   { "type": "round:submit",  "roomId": "...", "answers": { name, place, animal, thing } }
 *   { "type": "challenge:raise",   "roomId": "...", "roundId": N, "category": "...", "targetPlayer": "..." }
 *   { "type": "challenge:resolve", "roomId": "...", "challengeId": "...", "decision": true/false }
 *
 * Server → Client messages:
 *   { "type": "room:joined",    "roomId": "...", "players": [...], "playerId": "...", "isHost": true }
 *   { "type": "room:players",   "players": [...] }
 *   { "type": "round:new",      "roundNumber": N, "letter": "A", "startsAt": epoch_ms }
 *   { "type": "round:tick",     "secondsLeft": N }
 *   { "type": "round:ended" }
 *   { "type": "results:show",   "answers": {...}, "scores": {...}, "challengeEndsAt": epoch_ms }
 *   { "type": "scores:locked",  "leaderboard": [...] }
 *   { "type": "game:over",      "finalLeaderboard": [...] }
 *   { "type": "error",          "message": "..." }
 */

#include <crow.h>
#include <nlohmann/json.hpp>

#include "gameManager.h"
#include "gameManager.cpp"     // Single-TU build
#include "dictionary.h"
#include "geminiValidator.h"
#include "scoringEngine.h"
#include "letterPool.h"
#include "excelStore.h"

#include <string>
#include <map>
#include <set>
#include <mutex>
#include <thread>
#include <chrono>
#include <functional>
#include <atomic>
#include <filesystem>
#include <fstream>
#include <sstream>

using json = nlohmann::json;

// ────── Global state ──────

struct ConnectionInfo {
    std::string playerId;
    std::string roomId;
};

// Map: websocket connection ptr identity → connection info
// We use crow::websocket::connection* as a raw pointer key
static std::map<crow::websocket::connection*, ConnectionInfo> connMap;
static std::mutex connMtx;

// Map: roomId → set of connection pointers (for broadcast)
static std::map<std::string, std::set<crow::websocket::connection*>> roomConns;

// Timer threads: roomId → atomic flag to stop timer
static std::map<std::string, std::atomic<bool>*> roomTimerFlags;
static std::mutex timerMtx;

// ────── Helpers ──────

long long nowMs() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();
}

std::string genChallengeId() {
    static std::atomic<int> counter{0};
    return "ch_" + std::to_string(nowMs()) + "_" + std::to_string(counter++);
}

// Broadcast JSON to all connections in a room
void broadcastToRoom(const std::string& roomId, const json& msg) {
    std::string payload = msg.dump();
    std::lock_guard<std::mutex> lock(connMtx);
    auto it = roomConns.find(roomId);
    if (it == roomConns.end()) return;
    for (auto* conn : it->second) {
        try { conn->send_text(payload); } catch (...) {}
    }
}

// Send to single connection
void sendTo(crow::websocket::connection* conn, const json& msg) {
    try { conn->send_text(msg.dump()); } catch (...) {}
}

// Build player list JSON
json buildPlayerList(const std::string& roomId) {
    auto& gm = GameManager::instance();
    auto players = gm.getPlayers(roomId);
    json arr = json::array();
    for (auto& p : players) {
        arr.push_back({
            {"playerId",   p.playerId},
            {"playerName", p.playerName},
            {"isHost",     p.isHost},
            {"totalScore", p.totalScore}
        });
    }
    return arr;
}

// Build leaderboard JSON
json buildLeaderboard(const std::string& roomId) {
    auto& gm = GameManager::instance();
    auto players = gm.getPlayers(roomId);
    auto sorted = ScoringEngine::sortLeaderboard(players);
    json arr = json::array();
    int rank = 1;
    for (auto& p : sorted) {
        if (p.isHost) continue;  // Host should not be displayed in the leaderboard
        long long avgMs = p.completedRounds > 0 ? p.totalSubmitMs / p.completedRounds : 0;
        arr.push_back({
            {"rank",            rank++},
            {"playerId",        p.playerId},
            {"playerName",      p.playerName},
            {"totalScore",      p.totalScore},
            {"totalUnique",     p.totalUnique},
            {"completedRounds", p.completedRounds},
            {"avgSubmitMs",     avgMs}
        });
    }
    return arr;
}

// ────── Scoring + results broadcast ──────

void runScoring(crow::App<>& app, const std::string& roomId) {
    // Give a small grace period for any last-second websocket packages to arrive/process
    std::this_thread::sleep_for(std::chrono::milliseconds(1500));

    auto& gm = GameManager::instance();
    std::unique_lock<std::mutex> lock(gm.mtx);
    GameState* state = gm.getRoom(roomId);
    if (!state || state->rounds.empty()) return;

    RoundData& round = state->rounds.back();
    round.endedAt = nowMs();
    state->phase = RoomPhase::RESULTS;
    state->accepting = false;

    // Ensure every non-host player in the room has a submission entry (even if empty)
    for (const auto& [pid, p] : state->players) {
        if (p.isHost) continue;  // Host does not submit or appear in results
        if (!round.submissions.count(pid)) {
            AnswerSet emptyAns;
            emptyAns.submittedAt = nowMs() - state->roundStartedAt;
            round.submissions[pid] = emptyAns;
        }
    }

    // Collect words to query from Gemini API
    std::vector<GeminiValidator::WordItem> toQuery;
    char targetLower = (char)std::tolower((unsigned char)round.letter);
    
    for (const auto& [pid, ans] : round.submissions) {
        auto checkAndAdd = [&](const std::string& cat, const std::string& val) {
            std::string n = ScoringEngine::normalise(val);
            if (!n.empty() && n[0] == targetLower) {
                if (!Dictionary::isValid(cat, n)) {
                    bool cachedVal = false;
                    if (!GeminiValidator::instance().isCached(cat, n, cachedVal)) {
                        toQuery.push_back({cat, n});
                    }
                }
            }
        };
        checkAndAdd("name", ans.name);
        checkAndAdd("place", ans.place);
        checkAndAdd("animal", ans.animal);
        checkAndAdd("thing", ans.thing);
    }
    
    // Query Gemini API outside of the GameManager lock
    if (!toQuery.empty() && GeminiValidator::instance().hasApiKey()) {
        lock.unlock();
        GeminiValidator::instance().batchValidate(toQuery);
        lock.lock();
        
        // Re-get state in case it was modified or deleted while unlocked
        state = gm.getRoom(roomId);
        if (!state || state->rounds.empty()) return;
    }

    // Score the round
    round.results = ScoringEngine::scoreRound(round.submissions, round.letter);

    // Update cumulative player stats
    for (auto& [pid, res] : round.results) {
        if (state->players.count(pid)) {
            auto& p = state->players[pid];
            p.totalScore    += res.total;
            p.totalUnique   += res.uniqueCount;
            p.totalSubmitMs += res.submittedAt;
            p.completedRounds++;
            p.lastSubmitTime = res.submittedAt;
        }
    }

    // Build results payload
    json answersJson = json::object();
    json scoresJson  = json::object();
    for (auto& [pid, res] : round.results) {
        answersJson[pid] = {
            {"name",   res.answers.name},
            {"place",  res.answers.place},
            {"animal", res.answers.animal},
            {"thing",  res.answers.thing}
        };
        std::string pName = state->players.count(pid) ? state->players[pid].playerName : pid;
        scoresJson[pid] = {
            {"playerName",  pName},
            {"breakdown", {
                {"name",   res.breakdown.name},
                {"place",  res.breakdown.place},
                {"animal", res.breakdown.animal},
                {"thing",  res.breakdown.thing}
            }},
            {"total",       res.total},
            {"uniqueCount", res.uniqueCount},
            {"submittedAt", res.submittedAt}
        };
    }

    long long challengeEndsAt = nowMs() + GameState::CHALLENGE_WINDOW_MS;
    state->challengeEndsAt = challengeEndsAt;
    state->phase = RoomPhase::CHALLENGE_WINDOW;

    lock.unlock();

    // Broadcast results
    broadcastToRoom(roomId, {
        {"type",            "results:show"},
        {"roundNumber",     round.roundNumber},
        {"answers",         answersJson},
        {"scores",          scoresJson},
        {"challengeEndsAt", challengeEndsAt}
    });

    // After challenge window, lock scores
    std::this_thread::sleep_for(std::chrono::milliseconds(GameState::CHALLENGE_WINDOW_MS));

    lock.lock();
    state = gm.getRoom(roomId);
    if (!state) return;
    state->phase = RoomPhase::SCORES_LOCKED;
    auto leaderboard = buildLeaderboard(roomId);
    int roundNum = round.roundNumber;
    bool gameOver = roundNum >= state->maxRounds;

    // Flush to Excel (TSV) removed, frontend now saves to Supabase

    lock.unlock();

    broadcastToRoom(roomId, {
        {"type",        "scores:locked"},
        {"leaderboard", leaderboard},
        {"roundNumber", roundNum}
    });

    if (gameOver) {
        std::this_thread::sleep_for(std::chrono::seconds(2));
        lock.lock();
        state = gm.getRoom(roomId);
        if (state) state->phase = RoomPhase::GAME_OVER;
        lock.unlock();
        broadcastToRoom(roomId, {
            {"type",             "game:over"},
            {"finalLeaderboard", leaderboard}
        });
    }
}

// ────── Timer engine ──────

void startRoundTimer(crow::App<>& app, const std::string& roomId, std::atomic<bool>* stopFlag) {
    auto& gm = GameManager::instance();

    {
        std::lock_guard<std::mutex> lock(gm.mtx);
        GameState* state = gm.getRoom(roomId);
        if (!state) return;
        long long now = nowMs();
        state->roundStartedAt = now;
        state->roundEndsAt    = now + state->roundDurationMs;
        state->accepting      = true;
        state->phase          = RoomPhase::ROUND_ACTIVE;
    }

    while (!stopFlag->load()) {
        long long remaining;
        bool paused = false;
        {
            std::lock_guard<std::mutex> lock(gm.mtx);
            GameState* state = gm.getRoom(roomId);
            if (!state || !state->accepting) break;
            paused = state->isPaused;
            if (paused) {
                remaining = state->pauseRemaining;
            } else {
                remaining = (state->roundEndsAt - nowMs() + 999) / 1000;
                if (remaining < 0) remaining = 0;
            }
        }

        broadcastToRoom(roomId, {
            {"type",        "round:tick"},
            {"secondsLeft", (int)remaining},
            {"isPaused",    paused}
        });

        if (remaining <= 0 && !paused) {
            broadcastToRoom(roomId, {{"type", "round:ended"}});
            // Run scoring in a separate thread so this timer thread can exit cleanly
            std::thread([&app, roomId]() {
                runScoring(app, roomId);
            }).detach();
            break;
        }

        std::this_thread::sleep_for(std::chrono::seconds(1));
    }
    stopFlag->store(true);
}

// ────── Message handler ──────

void handleMessage(crow::App<>& app,
                   crow::websocket::connection& conn,
                   const std::string& raw)
{
    auto& gm = GameManager::instance();

    json msg;
    try {
        msg = json::parse(raw);
    } catch (...) {
        sendTo(&conn, {{"type","error"},{"message","Invalid JSON"}});
        return;
    }

    std::string type = msg.value("type", "");

    // ── room:create ──
    if (type == "room:create") {
        std::string hostName = msg.value("hostName", "Host");
        int playerLimit = msg.value("playerLimit", 10);
        int maxRounds   = msg.value("maxRounds", 15);
        int roundDuration = msg.value("roundDuration", 60) * 1000;
        std::string playerId = gm.generatePlayerId();
        std::string roomId   = gm.createRoom(playerId, hostName, playerLimit, maxRounds, roundDuration);
        
        int actualLimit = 10;
        int actualRounds = 15;
        int actualDuration = 60000;
        {
            std::unique_lock<std::mutex> lock(gm.mtx);
            GameState* state = gm.getRoom(roomId);
            if (state) {
                actualLimit = state->playerLimit;
                actualRounds = state->maxRounds;
                actualDuration = state->roundDurationMs;
            }
        }

        {
            std::lock_guard<std::mutex> lock(connMtx);
            connMap[&conn] = { playerId, roomId };
            roomConns[roomId].insert(&conn);
        }

        sendTo(&conn, {
            {"type",        "room:joined"},
            {"roomId",      roomId},
            {"playerId",    playerId},
            {"isHost",      true},
            {"playerLimit", actualLimit},
            {"maxRounds",   actualRounds},
            {"roundDuration", actualDuration / 1000},
            {"players",     buildPlayerList(roomId)}
        });
    }

    // ── room:join ──
    else if (type == "room:join") {
        std::string roomId     = msg.value("roomId", "");
        std::string playerName = msg.value("playerName", "Player");
        std::string playerId   = gm.generatePlayerId();

        if (!gm.roomExists(roomId)) {
            sendTo(&conn, {{"type","error"},{"message","Room not found"}});
            return;
        }
        if (!gm.joinRoom(roomId, playerId, playerName)) {
            sendTo(&conn, {{"type","error"},{"message","Cannot join room (username taken, game in progress, or room full)"}});
            return;
        }

        int actualLimit = 10;
        int actualRounds = 15;
        int actualDuration = 60000;
        {
            std::unique_lock<std::mutex> lock(gm.mtx);
            GameState* state = gm.getRoom(roomId);
            if (state) {
                actualLimit = state->playerLimit;
                actualRounds = state->maxRounds;
                actualDuration = state->roundDurationMs;
            }
        }

        {
            std::lock_guard<std::mutex> lock(connMtx);
            connMap[&conn] = { playerId, roomId };
            roomConns[roomId].insert(&conn);
        }

        sendTo(&conn, {
            {"type",        "room:joined"},
            {"roomId",      roomId},
            {"playerId",    playerId},
            {"isHost",      false},
            {"playerLimit", actualLimit},
            {"maxRounds",   actualRounds},
            {"roundDuration", actualDuration / 1000},
            {"players",     buildPlayerList(roomId)}
        });

        // Notify all others of updated player list
        broadcastToRoom(roomId, {
            {"type",    "room:players"},
            {"players", buildPlayerList(roomId)}
        });
    }

    // ── room:kick ──
    else if (type == "room:kick") {
        std::string targetId = msg.value("targetId", "");
        std::string roomId;
        {
            std::lock_guard<std::mutex> cLock(connMtx);
            auto it = connMap.find(&conn);
            if (it == connMap.end()) return;
            roomId = it->second.roomId;
            std::string myPid = it->second.playerId;
            
            std::unique_lock<std::mutex> gmLock(gm.mtx);
            GameState* state = gm.getRoom(roomId);
            if (!state || !state->players.count(myPid) || !state->players[myPid].isHost) {
                return;
            }
        }

        {
            std::lock_guard<std::mutex> cLock(connMtx);
            for (auto* c : roomConns[roomId]) {
                if (connMap[c].playerId == targetId) {
                    sendTo(c, {{"type","room:kicked"}});
                    break;
                }
            }
        }

        gm.removePlayer(roomId, targetId);

        broadcastToRoom(roomId, {
            {"type",    "room:players"},
            {"players", buildPlayerList(roomId)}
        });
    }

    // ── round:start ──
    else if (type == "round:start") {
        std::string roomId;
        {
            std::lock_guard<std::mutex> lock(connMtx);
            auto it = connMap.find(&conn);
            if (it == connMap.end()) return;
            roomId = it->second.roomId;
        }

        std::unique_lock<std::mutex> lock(gm.mtx);
        GameState* state = gm.getRoom(roomId);
        if (!state) return;

        // Only host can start
        {
            std::lock_guard<std::mutex> cLock(connMtx);
            auto it = connMap.find(&conn);
            if (it == connMap.end()) return;
            std::string pid = it->second.playerId;
            if (!state->players.count(pid) || !state->players[pid].isHost) {
                lock.unlock();
                sendTo(&conn, {{"type","error"},{"message","Only host can start round"}});
                return;
            }
        }

        if (state->phase == RoomPhase::GAME_OVER) {
            lock.unlock();
            sendTo(&conn, {{"type","error"},{"message","Game is over"}});
            return;
        }

        if (state->phase == RoomPhase::ROUND_ACTIVE) {
            lock.unlock();
            sendTo(&conn, {{"type","error"},{"message","Round already in progress"}});
            return;
        }

        // Advance round
        state->currentRound++;
        char letter = LetterPool::getRandomLetter(state->usedLetters);
        long long startsAt = nowMs() + 3000; // 3s countdown before round

        RoundData rd;
        rd.roundNumber = state->currentRound;
        rd.letter      = letter;
        rd.startedAt   = startsAt;
        state->rounds.push_back(rd);

        lock.unlock();

        broadcastToRoom(roomId, {
            {"type",        "round:new"},
            {"roundNumber", state->currentRound},
            {"letter",      std::string(1, letter)},
            {"startsAt",    startsAt}
        });

        // Stop any existing timer
        {
            std::lock_guard<std::mutex> tLock(timerMtx);
            if (roomTimerFlags.count(roomId)) {
                roomTimerFlags[roomId]->store(true);
                delete roomTimerFlags[roomId];
            }
            roomTimerFlags[roomId] = new std::atomic<bool>(false);
        }

        // Start timer after 3s delay
        auto* flag = roomTimerFlags[roomId];
        std::thread([&app, roomId, flag, startsAt]() {
            long long delay = startsAt - nowMs();
            if (delay > 0)
                std::this_thread::sleep_for(std::chrono::milliseconds(delay));
            if (!flag->load())
                startRoundTimer(app, roomId, flag);
        }).detach();
    }

    // ── round:stop ──
    else if (type == "round:stop") {
        std::string roomId;
        {
            std::lock_guard<std::mutex> lock(connMtx);
            auto it = connMap.find(&conn);
            if (it == connMap.end()) return;
            roomId = it->second.roomId;
        }

        std::unique_lock<std::mutex> lock(gm.mtx);
        GameState* state = gm.getRoom(roomId);
        if (!state) return;

        // Verify sender is host
        {
            std::lock_guard<std::mutex> cLock(connMtx);
            auto it = connMap.find(&conn);
            if (it == connMap.end()) return;
            std::string pid = it->second.playerId;
            if (!state->players.count(pid) || !state->players[pid].isHost) {
                lock.unlock();
                sendTo(&conn, {{"type","error"},{"message","Only host can stop round"}});
                return;
            }
        }

        if (state->phase != RoomPhase::ROUND_ACTIVE) {
            lock.unlock();
            sendTo(&conn, {{"type","error"},{"message","No active round to stop"}});
            return;
        }

        // Set roundEndsAt to past time to force the timer thread to finish instantly
        state->roundEndsAt = nowMs() - 10000;
        state->isPaused = false;
        lock.unlock();

        broadcastToRoom(roomId, {
            {"type", "round:stopped_early"},
            {"message", "Round was stopped early by the host"}
        });
    }

    // ── round:toggle_pause ──
    else if (type == "round:toggle_pause") {
        std::string roomId;
        {
            std::lock_guard<std::mutex> lock(connMtx);
            auto it = connMap.find(&conn);
            if (it == connMap.end()) return;
            roomId = it->second.roomId;
        }

        std::unique_lock<std::mutex> lock(gm.mtx);
        GameState* state = gm.getRoom(roomId);
        if (!state) return;

        // Verify sender is host
        {
            std::lock_guard<std::mutex> cLock(connMtx);
            auto it = connMap.find(&conn);
            if (it == connMap.end()) return;
            std::string pid = it->second.playerId;
            if (!state->players.count(pid) || !state->players[pid].isHost) {
                lock.unlock();
                sendTo(&conn, {{"type","error"},{"message","Only host can pause/resume"}});
                return;
            }
        }

        if (state->phase != RoomPhase::ROUND_ACTIVE) {
            lock.unlock();
            sendTo(&conn, {{"type","error"},{"message","No active round to pause/resume"}});
            return;
        }

        if (state->isPaused) {
            state->isPaused = false;
            state->roundEndsAt = nowMs() + state->pauseRemaining * 1000;
        } else {
            state->isPaused = true;
            long long rem = (state->roundEndsAt - nowMs() + 999) / 1000;
            if (rem < 0) rem = 0;
            state->pauseRemaining = rem;
        }

        bool currentlyPaused = state->isPaused;
        lock.unlock();

        broadcastToRoom(roomId, {
            {"type", "round:pause_toggled"},
            {"isPaused", currentlyPaused}
        });
    }

    // ── round:change_letter ──
    else if (type == "round:change_letter") {
        std::string roomId;
        {
            std::lock_guard<std::mutex> lock(connMtx);
            auto it = connMap.find(&conn);
            if (it == connMap.end()) return;
            roomId = it->second.roomId;
        }

        std::unique_lock<std::mutex> lock(gm.mtx);
        GameState* state = gm.getRoom(roomId);
        if (!state) return;

        // Verify sender is host
        {
            std::lock_guard<std::mutex> cLock(connMtx);
            auto it = connMap.find(&conn);
            if (it == connMap.end()) return;
            std::string pid = it->second.playerId;
            if (!state->players.count(pid) || !state->players[pid].isHost) {
                lock.unlock();
                sendTo(&conn, {{"type","error"},{"message","Only host can change letter"}});
                return;
            }
        }

        if (state->rounds.empty()) {
            lock.unlock();
            return;
        }

        char newLetter = 'A';
        if (msg.contains("letter") && msg["letter"].is_string() && !msg["letter"].get<std::string>().empty()) {
            newLetter = toupper(msg["letter"].get<std::string>()[0]);
        } else {
            newLetter = LetterPool::getRandomLetter(state->usedLetters);
        }

        state->rounds.back().letter = newLetter;

        if (state->isPaused) {
            state->pauseRemaining = state->roundDurationMs / 1000;
        } else {
            state->roundEndsAt = nowMs() + state->roundDurationMs;
        }

        lock.unlock();

        broadcastToRoom(roomId, {
            {"type",   "round:letter_changed"},
            {"letter", std::string(1, newLetter)},
            {"resetTime", true}
        });
    }

    // ── game:stop ──
    else if (type == "game:stop") {
        std::string roomId;
        {
            std::lock_guard<std::mutex> lock(connMtx);
            auto it = connMap.find(&conn);
            if (it == connMap.end()) return;
            roomId = it->second.roomId;
        }

        std::unique_lock<std::mutex> lock(gm.mtx);
        GameState* state = gm.getRoom(roomId);
        if (!state) return;

        // Verify sender is host
        {
            std::lock_guard<std::mutex> cLock(connMtx);
            auto it = connMap.find(&conn);
            if (it == connMap.end()) return;
            std::string pid = it->second.playerId;
            if (!state->players.count(pid) || !state->players[pid].isHost) {
                lock.unlock();
                sendTo(&conn, {{"type","error"},{"message","Only host can stop the game"}});
                return;
            }
        }

        state->phase = RoomPhase::GAME_OVER;
        auto leaderboard = buildLeaderboard(roomId);
        lock.unlock();

        broadcastToRoom(roomId, {
            {"type",             "game:over"},
            {"finalLeaderboard", leaderboard}
        });
    }

    // ── round:submit ──
    else if (type == "round:submit") {
        std::string roomId, playerId;
        {
            std::lock_guard<std::mutex> lock(connMtx);
            auto it = connMap.find(&conn);
            if (it == connMap.end()) return;
            roomId   = it->second.roomId;
            playerId = it->second.playerId;
        }

        AnswerSet ans;
        if (msg.contains("answers")) {
            ans.name   = msg["answers"].value("name",   "");
            ans.place  = msg["answers"].value("place",  "");
            ans.animal = msg["answers"].value("animal", "");
            ans.thing  = msg["answers"].value("thing",  "");
        }

        bool ok = false;
        bool allSubmitted = false;
        {
            std::unique_lock<std::mutex> lock(gm.mtx);
            GameState* state = gm.getRoom(roomId);
            if (state) {
                ans.submittedAt = nowMs() - state->roundStartedAt;
                std::cout << "[Submit] Room: " << roomId << ", Player: " << playerId 
                          << ", Answers: { name: '" << ans.name << "', place: '" << ans.place 
                          << "', animal: '" << ans.animal << "', thing: '" << ans.thing << "' }" << std::endl;
                ok = gm.submitAnswer(roomId, playerId, ans);
                std::cout << "[Submit] result: " << (ok ? "ACCEPTED" : "REJECTED") << std::endl;
                if (ok && state->phase == RoomPhase::ROUND_ACTIVE) {
                    size_t subs = state->rounds.back().submissions.size();
                    // Count only non-host players (host does not submit)
                    size_t total = 0;
                    for (const auto& [pid, p] : state->players) {
                        if (!p.isHost) total++;
                    }
                    if (subs >= total && total > 0) {
                        state->roundEndsAt = nowMs() - 10000;
                        state->isPaused = false;
                        allSubmitted = true;
                    }
                }
            }
        }

        sendTo(&conn, {
            {"type",     "submit:ack"},
            {"accepted", ok}
        });

        if (allSubmitted) {
            broadcastToRoom(roomId, {
                {"type", "round:stopped_early"},
                {"message", "All players have submitted!"}
            });
        }
    }

    // ── challenge:raise ──
    else if (type == "challenge:raise") {
        std::string roomId, playerId;
        {
            std::lock_guard<std::mutex> lock(connMtx);
            auto it = connMap.find(&conn);
            if (it == connMap.end()) return;
            roomId   = it->second.roomId;
            playerId = it->second.playerId;
        }

        std::string category     = msg.value("category", "");
        std::string targetPlayer = msg.value("targetPlayer", "");

        std::lock_guard<std::mutex> lock(gm.mtx);
        GameState* state = gm.getRoom(roomId);
        if (!state || state->phase != RoomPhase::CHALLENGE_WINDOW) return;
        if (nowMs() > state->challengeEndsAt) return; // Window closed

        Challenge ch;
        ch.challengeId    = genChallengeId();
        ch.category       = category;
        ch.challengerId   = playerId;
        ch.targetPlayerId = targetPlayer;
        ch.roundId        = "round_" + std::to_string(state->currentRound);
        state->rounds.back().challenges.push_back(ch);

        broadcastToRoom(roomId, {
            {"type",         "challenge:new"},
            {"challengeId",  ch.challengeId},
            {"category",     category},
            {"challenger",   playerId},
            {"target",       targetPlayer},
            {"roundId",      ch.roundId}
        });
    }

    // ── challenge:resolve ──
    else if (type == "challenge:resolve") {
        std::string roomId, playerId;
        {
            std::lock_guard<std::mutex> lock(connMtx);
            auto it = connMap.find(&conn);
            if (it == connMap.end()) return;
            roomId   = it->second.roomId;
            playerId = it->second.playerId;
        }

        std::string challengeId = msg.value("challengeId", "");
        bool decision           = msg.value("decision", false);

        std::lock_guard<std::mutex> lock(gm.mtx);
        GameState* state = gm.getRoom(roomId);
        if (!state) return;

        // Only host can resolve
        if (!state->players.count(playerId) || !state->players[playerId].isHost) return;

        if (state->rounds.empty()) return;
        auto& round = state->rounds.back();
        for (auto& ch : round.challenges) {
            if (ch.challengeId == challengeId && !ch.resolved) {
                ch.resolved = true;
                ch.accepted = decision;
                // If accepted, zero out the challenged category
                if (decision && round.results.count(ch.targetPlayerId)) {
                    auto& res = round.results[ch.targetPlayerId];
                    auto& pi  = state->players[ch.targetPlayerId];
                    int deducted = 0;
                    if (ch.category == "name")   { deducted = res.breakdown.name;   res.breakdown.name   = 0; }
                    if (ch.category == "place")  { deducted = res.breakdown.place;  res.breakdown.place  = 0; }
                    if (ch.category == "animal") { deducted = res.breakdown.animal; res.breakdown.animal = 0; }
                    if (ch.category == "thing")  { deducted = res.breakdown.thing;  res.breakdown.thing  = 0; }
                    res.total     -= deducted;
                    pi.totalScore -= deducted;
                }
                break;
            }
        }

        broadcastToRoom(roomId, {
            {"type",        "challenge:resolved"},
            {"challengeId", challengeId},
            {"accepted",    decision}
        });
    }
}

// ────── main ──────

int main(int argc, char* argv[]) {
    // Initialize Gemini Validator
    GeminiValidator::instance().init();

    // Init Excel store
    std::filesystem::create_directories("data");
    ExcelStore::instance().init("data/gamedata");

    crow::App<> app;

    // WebSocket route
    CROW_WEBSOCKET_ROUTE(app, "/ws")
        .onopen([](crow::websocket::connection& conn) {
            CROW_LOG_INFO << "WS connected: " << &conn;
        })
        .onmessage([&app](crow::websocket::connection& conn, const std::string& data, bool isBinary) {
            if (!isBinary) handleMessage(app, conn, data);
        })
        .onclose([](crow::websocket::connection& conn, const std::string& reason, uint16_t /*status*/) {
            CROW_LOG_INFO << "WS closed: " << &conn << " reason=" << reason;
            std::string roomId;
            std::string playerId;
            {
                std::lock_guard<std::mutex> lock(connMtx);
                auto it = connMap.find(&conn);
                if (it != connMap.end()) {
                    roomId   = it->second.roomId;
                    playerId = it->second.playerId;
                    connMap.erase(it);
                }
                if (!roomId.empty()) {
                    roomConns[roomId].erase(&conn);
                    if (roomConns[roomId].empty()) roomConns.erase(roomId);
                }
            }
            if (!roomId.empty() && !playerId.empty()) {
                // Notify room of player departure
                broadcastToRoom(roomId, {
                    {"type",     "player:left"},
                    {"playerId", playerId}
                });
            }
        });

    // Health check
    CROW_ROUTE(app, "/health")([]{
        return crow::response(200, "OK");
    });

    // Serve the React Frontend on the root path
    CROW_ROUTE(app, "/")([](const crow::request& req, crow::response& res){
        std::ifstream in("static/index.html", std::ios::in | std::ios::binary);
        if (in) {
            std::ostringstream contents;
            contents << in.rdbuf();
            res.write(contents.str());
            res.set_header("Content-Type", "text/html");
        } else {
            res.code = 404;
            res.write("Frontend not found! Did you compile the client?");
        }
        res.end();
    });

    // Serve React static assets + client-side routing fallback
    // (avoids Crow v1.3.2 bug where <path> parameter registers the route twice)
    CROW_CATCHALL_ROUTE(app)([](const crow::request& req, crow::response& res) {
        std::string url = req.url;

        // Strip query string if present
        auto qpos = url.find('?');
        if (qpos != std::string::npos) url = url.substr(0, qpos);

        std::string filepath;
        if (url.size() >= 8 && url.substr(0, 8) == "/static/") {
            // /static/assets/foo.js  →  static/assets/foo.js
            filepath = "static/" + url.substr(8);
        } else {
            // Fallback for SPA routing
            filepath = "static/index.html";
        }

        std::ifstream in(filepath, std::ios::in | std::ios::binary);
        if (!in) {
            // Clear stream error state before opening fallback file
            in.clear();
            in.open("static/index.html", std::ios::in | std::ios::binary);
            if (!in) {
                res.code = 404;
                res.write("Not found");
                res.end();
                return;
            }
            res.set_header("Content-Type", "text/html");
        } else {
            if      (filepath.ends_with(".js"))    res.set_header("Content-Type", "application/javascript");
            else if (filepath.ends_with(".css"))   res.set_header("Content-Type", "text/css");
            else if (filepath.ends_with(".svg"))   res.set_header("Content-Type", "image/svg+xml");
            else if (filepath.ends_with(".png"))   res.set_header("Content-Type", "image/png");
            else if (filepath.ends_with(".ico"))   res.set_header("Content-Type", "image/x-icon");
            else if (filepath.ends_with(".woff2")) res.set_header("Content-Type", "font/woff2");
            else if (filepath.ends_with(".html"))  res.set_header("Content-Type", "text/html");
            else                                    res.set_header("Content-Type", "application/octet-stream");
        }

        std::ostringstream contents;
        contents << in.rdbuf();
        res.write(contents.str());
        res.end();
    });

    // Load Dictionaries
    Dictionary::load("data");

    int port = 3001;
    if (argc > 1) port = std::stoi(argv[1]);

    std::cout << "\n╔══════════════════════════════════════╗\n";
    std::cout <<   "║   Think & Type  —  C++ Game Server   ║\n";
    std::cout <<   "║   Listening on port " << port << "              ║\n";
    std::cout <<   "╚══════════════════════════════════════╝\n\n";

    app.port(port).multithreaded().run();
    return 0;
}
