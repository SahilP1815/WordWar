#pragma once
#include <string>
#include <unordered_set>
#include <iostream>
#include <filesystem>
#include <algorithm>
#include <cctype>
#include "sqlite3.h"

namespace Dictionary {

inline std::unordered_set<std::string> names;
inline std::unordered_set<std::string> places;
inline std::unordered_set<std::string> animals;
inline std::unordered_set<std::string> things;
inline bool loaded = false;

inline void load(const std::string& dataDir) {
    if (loaded) return;
    std::string dbPath = dataDir + "/dictionary.db";
    std::cout << "[Dictionary] Loading dictionaries from SQLite DB " << dbPath << "..." << std::endl;

    if (!std::filesystem::exists(dbPath)) {
        std::vector<std::string> prefixes = {"../", "../../", "../../../"};
        for (const auto& prefix : prefixes) {
            std::string tryPath = prefix + dbPath;
            if (std::filesystem::exists(tryPath)) {
                dbPath = tryPath;
                break;
            }
        }
    }

    sqlite3* db;
    if (sqlite3_open(dbPath.c_str(), &db) != SQLITE_OK) {
        std::cerr << "[Dictionary] Error: could not open SQLite database: " << sqlite3_errmsg(db) << std::endl;
        return;
    }

    const char* sql = "SELECT word, category FROM words";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        std::cerr << "[Dictionary] Error preparing statement: " << sqlite3_errmsg(db) << std::endl;
        sqlite3_close(db);
        return;
    }

    while (sqlite3_step(stmt) == SQLITE_ROW) {
        std::string word = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 0));
        std::string cat  = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
        
        if (cat == "name") {
            names.insert(word);
        } else if (cat == "place") {
            places.insert(word);
        } else if (cat == "animal") {
            animals.insert(word);
        } else if (cat == "thing") {
            things.insert(word);
        }
    }

    sqlite3_finalize(stmt);
    sqlite3_close(db);

    loaded = true;
    std::cout << "[Dictionary] Loaded: " 
              << names.size() << " names, "
              << places.size() << " places, "
              << animals.size() << " animals, "
              << things.size() << " things." << std::endl;
}

inline void insertWord(const std::string& category, const std::string& word) {
    if (category == "name") {
        names.insert(word);
    } else if (category == "place") {
        places.insert(word);
    } else if (category == "animal") {
        animals.insert(word);
    } else if (category == "thing") {
        things.insert(word);
    }

    std::string dbPath = "data/dictionary.db";
    if (!std::filesystem::exists(dbPath)) {
        std::vector<std::string> prefixes = {"../", "../../", "../../../"};
        for (const auto& prefix : prefixes) {
            std::string tryPath = prefix + dbPath;
            if (std::filesystem::exists(tryPath)) {
                dbPath = tryPath;
                break;
            }
        }
    }

    sqlite3* db;
    if (sqlite3_open(dbPath.c_str(), &db) != SQLITE_OK) {
        return;
    }

    const char* sql = "INSERT OR IGNORE INTO words (word, category) VALUES (?, ?)";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) == SQLITE_OK) {
        sqlite3_bind_text(stmt, 1, word.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, 2, category.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_step(stmt);
        sqlite3_finalize(stmt);
    }
    sqlite3_close(db);
}

// Check spelling/category
inline bool isValid(const std::string& cat, const std::string& val) {
    if (val.empty()) return false;
    
    std::string lowerVal = val;
    for (char& c : lowerVal) {
        c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
    }

    if (cat == "name") {
        return names.count(lowerVal) > 0;
    } else if (cat == "place") {
        return places.count(lowerVal) > 0;
    } else if (cat == "animal") {
        return animals.count(lowerVal) > 0;
    } else if (cat == "thing") {
        return things.count(lowerVal) > 0 && 
               names.count(lowerVal) == 0 && 
               places.count(lowerVal) == 0 && 
               animals.count(lowerVal) == 0;
    }
    return false;
}

} // namespace Dictionary
