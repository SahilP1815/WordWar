#include "gameManager.h"
#include "letterPool.h"
#include <sstream>
#include <iomanip>
#include <chrono>
#include <random>
#include <algorithm>

// ────── Utility: generate IDs ──────

std::string GameManager::generateRoomId() {
    static const char chars[] = "ABCDEFGHJKLMNPRSTUVWX23456789";
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> dis(0, sizeof(chars) - 2);
    std::string id(6, ' ');
    for (auto& c : id) c = chars[dis(gen)];
    return id;
}

std::string GameManager::generatePlayerId() {
    auto now = std::chrono::high_resolution_clock::now().time_since_epoch().count();
    std::ostringstream ss;
    ss << "p" << std::hex << now;
    return ss.str();
}

// ────── Room management ──────

std::string GameManager::createRoom(const std::string& hostId, const std::string& hostName, int playerLimit, int maxRounds, int roundDurationMs) {
    std::lock_guard<std::mutex> lock(mtx);
    std::string roomId = generateRoomId();
    // Ensure uniqueness
    while (rooms_.count(roomId)) roomId = generateRoomId();

    GameState& state = rooms_[roomId];
    state.roomId = roomId;
    state.phase  = RoomPhase::LOBBY;
    state.currentRound = 0;
    state.playerLimit = playerLimit;
    state.maxRounds = maxRounds;
    state.roundDurationMs = roundDurationMs;

    PlayerInfo host;
    host.playerId    = hostId;
    host.playerName  = hostName;
    host.isHost      = true;
    host.joinedAt    = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();

    state.players[hostId] = host;
    return roomId;
}

bool GameManager::joinRoom(const std::string& roomId, const std::string& playerId, const std::string& playerName) {
    std::lock_guard<std::mutex> lock(mtx);
    auto it = rooms_.find(roomId);
    if (it == rooms_.end()) return false;
    if (it->second.phase != RoomPhase::LOBBY) return false; // Can't join mid-game
    int nonHostCount = 0;
    for (const auto& [pid, p] : it->second.players) {
        if (!p.isHost) nonHostCount++;
    }
    if (nonHostCount >= it->second.playerLimit) return false; // Room full

    // Check if player name already exists (case-insensitive check)
    for (const auto& [pid, p] : it->second.players) {
        std::string existingName = p.playerName;
        std::string newName = playerName;
        std::transform(existingName.begin(), existingName.end(), existingName.begin(), ::tolower);
        std::transform(newName.begin(), newName.end(), newName.begin(), ::tolower);
        if (existingName == newName) {
            return false; // Name already taken in this room
        }
    }

    PlayerInfo p;
    p.playerId   = playerId;
    p.playerName = playerName;
    p.isHost     = false;
    p.joinedAt   = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();

    it->second.players[playerId] = p;
    return true;
}

GameState* GameManager::getRoom(const std::string& roomId) {
    auto it = rooms_.find(roomId);
    if (it == rooms_.end()) return nullptr;
    return &it->second;
}

bool GameManager::roomExists(const std::string& roomId) const {
    return rooms_.count(roomId) > 0;
}

std::vector<PlayerInfo> GameManager::getPlayers(const std::string& roomId) {
    auto it = rooms_.find(roomId);
    if (it == rooms_.end()) return {};
    std::vector<PlayerInfo> res;
    for (auto& [id, p] : it->second.players) res.push_back(p);
    return res;
}

bool GameManager::submitAnswer(const std::string& roomId, const std::string& playerId, const AnswerSet& answers) {
    auto it = rooms_.find(roomId);
    if (it == rooms_.end()) return false;
    auto& state = it->second;
    if (!state.accepting) return false;
    if (state.rounds.empty()) return false;
    auto& round = state.rounds.back();
    if (round.submissions.count(playerId)) return false; // Already submitted
    round.submissions[playerId] = answers;
    return true;
}

void GameManager::removePlayer(const std::string& roomId, const std::string& playerId) {
    std::lock_guard<std::mutex> lock(mtx);
    auto it = rooms_.find(roomId);
    if (it == rooms_.end()) return;
    it->second.players.erase(playerId);
    if (it->second.players.empty()) {
        rooms_.erase(it);
    }
}

void GameManager::deleteRoom(const std::string& roomId) {
    std::lock_guard<std::mutex> lock(mtx);
    rooms_.erase(roomId);
}
