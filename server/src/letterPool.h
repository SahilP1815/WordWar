#pragma once
#include <vector>
#include <string>
#include <random>
#include <algorithm>

namespace LetterPool {

// Valid letters: A-W only (skip X, Q, Y, Z, U optionally)
static const std::vector<char> POOL = {
    'A','B','C','D','E','F','G','H','I','J','K','L','M',
    'N','O','P','R','S','T','V','W'
};

inline char getRandomLetter(std::vector<char>& usedLetters) {
    std::vector<char> available;
    for (char c : POOL) {
        if (std::find(usedLetters.begin(), usedLetters.end(), c) == usedLetters.end()) {
            available.push_back(c);
        }
    }
    if (available.empty()) {
        // Reset if exhausted
        usedLetters.clear();
        available = POOL;
    }
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> dis(0, (int)available.size() - 1);
    char chosen = available[dis(gen)];
    usedLetters.push_back(chosen);
    return chosen;
}

} // namespace LetterPool
