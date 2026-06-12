#pragma once
#include "gameManager.h"
#include "dictionary.h"
#include "geminiValidator.h"
#include <string>
#include <map>
#include <vector>
#include <algorithm>
#include <cctype>

namespace ScoringEngine {

// Check if word is valid locally or via Gemini cache
inline bool isWordValid(const std::string& cat, const std::string& val) {
    if (Dictionary::isValid(cat, val)) return true;
    
    bool geminiValid = false;
    if (GeminiValidator::instance().isCached(cat, val, geminiValid)) {
        return geminiValid;
    }
    return false;
}

// Normalise: trim + lowercase
inline std::string normalise(const std::string& s) {
    std::string r;
    r.reserve(s.size());
    bool leading = true;
    for (char c : s) {
        if (std::isspace((unsigned char)c)) {
            if (!leading && !r.empty() && r.back() != ' ') r += ' ';
        } else {
            leading = false;
            r += (char)std::tolower((unsigned char)c);
        }
    }
    // Trim trailing space
    while (!r.empty() && r.back() == ' ') r.pop_back();
    return r;
}

// Score all submissions for a round
inline std::map<std::string, PlayerRoundResult> scoreRound(
    const std::map<std::string, AnswerSet>& submissions,
    char targetLetter)
{
    const std::vector<std::string> cats = {"name","place","animal","thing"};

    // Build frequency maps per category
    std::map<std::string, std::map<std::string,int>> freq; // cat -> norm -> count
    for (const auto& [pid, ans] : submissions) {
        auto process = [&](const std::string& cat, const std::string& val) {
            std::string n = normalise(val);
            if (!n.empty()) {
                char targetLower = (char)std::tolower((unsigned char)targetLetter);
                if (n[0] == targetLower && isWordValid(cat, n)) {
                    freq[cat][n]++;
                }
            }
        };
        process("name",   ans.name);
        process("place",  ans.place);
        process("animal", ans.animal);
        process("thing",  ans.thing);
    }

    std::map<std::string, PlayerRoundResult> results;
    for (const auto& [pid, ans] : submissions) {
        PlayerRoundResult res;
        res.answers = ans;
        res.submittedAt = ans.submittedAt;
        int total = 0, unique = 0;

        auto score = [&](const std::string& cat, const std::string& val) -> int {
            std::string n = normalise(val);
            if (n.empty()) return 0;
            char targetLower = (char)std::tolower((unsigned char)targetLetter);
            if (n[0] != targetLower) return 0;
            if (!isWordValid(cat, n)) return 0;
            
            int cnt = freq[cat].count(n) ? freq[cat][n] : 0;
            if (cnt == 1) { unique++; return 10; }
            return 5;
        };

        res.breakdown.name   = score("name",   ans.name);
        res.breakdown.place  = score("place",  ans.place);
        res.breakdown.animal = score("animal", ans.animal);
        res.breakdown.thing  = score("thing",  ans.thing);

        res.total = res.breakdown.name + res.breakdown.place +
                    res.breakdown.animal + res.breakdown.thing;
        res.uniqueCount = unique;
        results[pid] = res;
    }
    return results;
}

// Sort leaderboard: totalScore > totalUnique > avgSubmitMs asc > completedRounds > lastSubmitTime asc
inline std::vector<PlayerInfo> sortLeaderboard(std::vector<PlayerInfo> players) {
    std::sort(players.begin(), players.end(), [](const PlayerInfo& a, const PlayerInfo& b) {
        if (b.totalScore    != a.totalScore)    return b.totalScore    < a.totalScore;
        if (b.totalUnique   != a.totalUnique)   return b.totalUnique   < a.totalUnique;
        long long avgA = a.completedRounds > 0 ? a.totalSubmitMs / a.completedRounds : 999999;
        long long avgB = b.completedRounds > 0 ? b.totalSubmitMs / b.completedRounds : 999999;
        if (avgA != avgB) return avgA < avgB;
        if (b.completedRounds != a.completedRounds) return b.completedRounds < a.completedRounds;
        return a.lastSubmitTime < b.lastSubmitTime;
    });
    return players;
}

} // namespace ScoringEngine
