#pragma once
#include "gameManager.h"
#include <string>
#include <vector>
#include <fstream>
#include <sstream>
#include <chrono>
#include <iomanip>
#include <mutex>
#include <filesystem>
#include <algorithm>
#include <iostream>
#include "sqlite3.h"

class ExcelStore {
public:
    static ExcelStore& instance() {
        static ExcelStore es;
        return es;
    }

    void init(const std::string& path) {
        std::lock_guard<std::mutex> lock(mtx_);
        filePath_ = path;
    }



    // Flush a completed round to disk
    void flushRound(const GameState& state, const RoundData& round) {
        std::lock_guard<std::mutex> lock(mtx_);
        if (filePath_.empty()) return;

        // Collect players in the room
        std::vector<PlayerInfo> playersList;
        for (const auto& [pid, p] : state.players) {
            playersList.push_back(p);
        }

        // Sort by total cumulative score descending
        std::sort(playersList.begin(), playersList.end(), [](const PlayerInfo& a, const PlayerInfo& b) {
            return b.totalScore < a.totalScore;
        });

        // 1. Write to _scores.csv and _scores.tsv (overwrite with latest sorted standings containing all fields)
        {
            std::ofstream fCsv(filePath_ + "_scores.csv", std::ios::trunc);
            std::ofstream fTsv(filePath_ + "_scores.tsv", std::ios::trunc);
            
            if (fCsv) {
                fCsv << "Rank,Player Name,Total Score,Uniques,Avg Submit,Rounds\n";
            }
            if (fTsv) {
                fTsv << "Rank\tPlayer Name\tTotal Score\tUniques\tAvg Submit\tRounds\n";
            }
            
            size_t rank = 1;
            for (size_t i = 0; i < playersList.size(); ++i) {
                const auto& p = playersList[i];
                if (p.isHost) continue;
                double avgSubmitSec = p.completedRounds > 0 
                    ? (static_cast<double>(p.totalSubmitMs) / p.completedRounds / 1000.0) 
                    : 0.0;
                
                std::ostringstream ss;
                ss << std::fixed << std::setprecision(2) << avgSubmitSec << "s";
                std::string avgSubmitStr = ss.str();

                if (fCsv) {
                    fCsv << rank << ','
                         << p.playerName << ','
                         << p.totalScore << ','
                         << p.totalUnique << ','
                         << avgSubmitStr << ','
                         << p.completedRounds << '\n';
                }
                if (fTsv) {
                    fTsv << rank << '\t'
                         << p.playerName << '\t'
                         << p.totalScore << '\t'
                         << p.totalUnique << '\t'
                         << avgSubmitStr << '\t'
                         << p.completedRounds << '\n';
                }
                rank++;
            }
        }

        // 2. Write to _players.csv (overwrite)
        {
            std::ofstream f(filePath_ + "_players.csv", std::ios::trunc);
            if (f) {
                f << "roomId,playerId,playerName,isHost,totalScore,completedRounds\n";
                for (const auto& p : playersList) {
                    f << state.roomId << ','
                      << p.playerId << ','
                      << p.playerName << ','
                      << (p.isHost ? "true" : "false") << ','
                      << p.totalScore << ','
                      << p.completedRounds << '\n';
                }
            }
        }

        // 3. Append to _answers.csv
        {
            bool writeHeader = !std::filesystem::exists(filePath_ + "_answers.csv");
            std::ofstream f(filePath_ + "_answers.csv", std::ios::app);
            if (f) {
                if (writeHeader) {
                    f << "roomId,roundNumber,playerId,name,place,animal,thing,submittedAt\n";
                }
                for (const auto& [pid, ans] : round.submissions) {
                    f << state.roomId << ','
                      << round.roundNumber << ','
                      << pid << ','
                      << ans.name << ','
                      << ans.place << ','
                      << ans.animal << ','
                      << ans.thing << ','
                      << ans.submittedAt << '\n';
                }
            }
        }

        // 4. Append to _rounds.csv
        {
            bool writeHeader = !std::filesystem::exists(filePath_ + "_rounds.csv");
            std::ofstream f(filePath_ + "_rounds.csv", std::ios::app);
            if (f) {
                if (writeHeader) {
                    f << "roomId,roundNumber,letter,startedAt,endedAt\n";
                }
                f << state.roomId << ','
                  << round.roundNumber << ','
                  << round.letter << ','
                  << round.startedAt << ','
                  << round.endedAt << '\n';
            }
        }
    }

private:
    std::string filePath_;
    std::mutex mtx_;
};
