#pragma once
#include <string>
#include <map>
#include <unordered_map>
#include <vector>
#include <set>
#include <chrono>
#include <mutex>
#include <functional>

// ────────── Data Structures ──────────

struct PlayerInfo {
    std::string playerId;
    std::string playerName;
    bool isHost = false;
    long long joinedAt = 0;
    // Cumulative stats
    int totalScore = 0;
    int totalUnique = 0;
    long long totalSubmitMs = 0;
    int completedRounds = 0;
    long long lastSubmitTime = 0;
};

struct AnswerSet {
    std::string name;
    std::string place;
    std::string animal;
    std::string thing;
    long long submittedAt = 0; // ms since round started
};

struct CategoryScore {
    int name = 0;
    int place = 0;
    int animal = 0;
    int thing = 0;
};

struct PlayerRoundResult {
    AnswerSet answers;
    CategoryScore breakdown;
    int total = 0;
    int uniqueCount = 0;
    long long submittedAt = 0;
};

struct Challenge {
    std::string challengeId;
    std::string roundId;
    std::string category;
    std::string challengerId;
    std::string targetPlayerId;
    bool resolved = false;
    bool accepted = false;
};

enum class RoomPhase {
    LOBBY,
    ROUND_ACTIVE,
    RESULTS,
    CHALLENGE_WINDOW,
    SCORES_LOCKED,
    GAME_OVER
};

struct RoundData {
    int roundNumber = 0;
    char letter = 'A';
    long long startedAt = 0;
    long long endedAt = 0;
    std::map<std::string, AnswerSet> submissions;       // playerId -> answers
    std::map<std::string, PlayerRoundResult> results;   // playerId -> results
    std::vector<Challenge> challenges;
};

struct GameState {
    std::string roomId;
    std::map<std::string, PlayerInfo> players;     // playerId -> info
    std::vector<RoundData> rounds;
    int currentRound = 0;
    RoomPhase phase = RoomPhase::LOBBY;
    bool accepting = false;
    bool isPaused = false;
    long long pauseRemaining = 0;
    long long roundStartedAt = 0;
    long long roundEndsAt = 0;
    long long challengeEndsAt = 0;
    std::vector<char> usedLetters;
    int maxRounds = 15;
    int playerLimit = 10;
    int roundDurationMs = 60000;          // Dynamic per room
    static constexpr int CHALLENGE_WINDOW_MS = 20000;     // 20 seconds
};

// ────────── GameManager ──────────

class GameManager {
public:
    static GameManager& instance() {
        static GameManager gm;
        return gm;
    }

    // Returns new roomId
    std::string createRoom(const std::string& hostId, const std::string& hostName, int playerLimit = 10, int maxRounds = 15, int roundDurationMs = 60000);

    // Returns false if room doesn't exist or full
    bool joinRoom(const std::string& roomId, const std::string& playerId, const std::string& playerName);

    GameState* getRoom(const std::string& roomId);

    bool roomExists(const std::string& roomId) const;

    std::vector<PlayerInfo> getPlayers(const std::string& roomId);

    // Returns false if already submitted or not accepting
    bool submitAnswer(const std::string& roomId, const std::string& playerId, const AnswerSet& answers);

    void removePlayer(const std::string& roomId, const std::string& playerId);

    void deleteRoom(const std::string& roomId);

    std::string generateRoomId();
    std::string generatePlayerId();

    mutable std::mutex mtx;

private:
    GameManager() = default;
    std::map<std::string, GameState> rooms_;
};
