#pragma once
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>
#include <fstream>
#include <iostream>
#include <cstdlib>
#include <sstream>
#include <memory>
#include <algorithm>
#include <nlohmann/json.hpp>
#include "dictionary.h"

using json = nlohmann::json;

class GeminiValidator {
public:
    static GeminiValidator& instance() {
        static GeminiValidator validator;
        return validator;
    }

    void init() {
        apiKey_ = loadApiKey();
        if (apiKey_.empty()) {
            std::cerr << "[GeminiValidator] WARNING: GEMINI_API_KEY is not set or empty! Validation will fall back to local dictionary only." << std::endl;
        } else {
            std::cout << "[GeminiValidator] Initialized with API key starting with: " << apiKey_.substr(0, 5) << "..." << std::endl;
        }
    }

    bool hasApiKey() const {
        return !apiKey_.empty();
    }

    std::string getApiKey() const {
        return apiKey_;
    }

    struct WordItem {
        std::string category; // name, place, animal, thing
        std::string word;
    };

    // Performs batch validation of new words using Gemini API.
    // Updates the in-memory cache and local SQLite DB for valid words.
    void batchValidate(const std::vector<WordItem>& items) {
        if (apiKey_.empty() || items.empty()) return;

        // Filter out words that we've already cached
        std::vector<WordItem> toQuery;
        for (const auto& item : items) {
            std::string key = item.category + ":" + item.word;
            if (cache_.find(key) == cache_.end()) {
                toQuery.push_back(item);
            }
        }

        if (toQuery.empty()) {
            std::cout << "[GeminiValidator] All " << items.size() << " words are already cached." << std::endl;
            return;
        }

        std::cout << "[GeminiValidator] Querying Gemini for " << toQuery.size() << " new words..." << std::endl;

        // Build Gemini request payload
        json promptJson = json::array();
        for (const auto& item : toQuery) {
            promptJson.push_back({
                {"category", item.category},
                {"word", item.word}
            });
        }

        std::string promptText = 
            "Validate if the following words are correct, exist, and are appropriate examples for the specified category in the game 'Name, Place, Animal, Thing'.\n"
            "Strictly follow the rules of the game. For each item, return true/false in the 'valid' field.\n"
            "Items to validate:\n" + promptJson.dump(2);

        json req;
        req["contents"] = json::array({{
            {"parts", json::array({{
                {"text", promptText}
            }})}
        }});

        // Explicitly build schema objects to ensure correct JSON formatting
        json schema = json::object();
        schema["type"] = "OBJECT";
        
        json properties = json::object();
        json results = json::object();
        results["type"] = "ARRAY";
        
        json schemaItems = json::object();
        schemaItems["type"] = "OBJECT";
        
        json itemProps = json::object();
        itemProps["word"] = json::object({{"type", "STRING"}});
        itemProps["category"] = json::object({{"type", "STRING"}});
        itemProps["valid"] = json::object({{"type", "BOOLEAN"}});
        
        schemaItems["properties"] = itemProps;
        schemaItems["required"] = json::array({"word", "category", "valid"});
        
        results["items"] = schemaItems;
        properties["results"] = results;
        
        schema["properties"] = properties;
        schema["required"] = json::array({"results"});
        
        req["generationConfig"] = json::object({
            {"responseMimeType", "application/json"},
            {"responseSchema", schema}
        });

        // Ensure target directory exists for request log
        std::filesystem::create_directories("data");
        std::string tempReqPath = "data/gemini_req.json";
        std::ofstream outFile(tempReqPath);
        if (!outFile.is_open()) {
            std::cerr << "[GeminiValidator] Error creating temp request file at " << tempReqPath << std::endl;
            return;
        }
        outFile << req.dump();
        outFile.close();

        // Run curl process and capture output
        std::string cmd = "curl -s -X POST -H \"Content-Type: application/json\" --data-binary @data/gemini_req.json "
                          "\"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey_ + "\"";

        std::string responseStr = executeCommand(cmd);

        // Clean up temp file
        std::remove(tempReqPath.c_str());

        if (responseStr.empty()) {
            std::cerr << "[GeminiValidator] Error: Received empty response from curl." << std::endl;
            return;
        }

        try {
            json resp = json::parse(responseStr);
            if (resp.contains("candidates") && resp["candidates"].is_array() && !resp["candidates"].empty()) {
                auto firstCand = resp["candidates"][0];
                if (firstCand.contains("content") && firstCand["content"].contains("parts") && !firstCand["content"]["parts"].empty()) {
                    std::string textContent = firstCand["content"]["parts"][0].value("text", "");
                    json innerResults = json::parse(textContent);

                    if (innerResults.contains("results") && innerResults["results"].is_array()) {
                        for (const auto& res : innerResults["results"]) {
                            std::string word = res.value("word", "");
                            std::string category = res.value("category", "");
                            bool valid = res.value("valid", false);

                            if (!word.empty() && !category.empty()) {
                                // Make word lowercase for caching/matching consistency
                                std::transform(word.begin(), word.end(), word.begin(), [](unsigned char c){ return std::tolower(c); });
                                std::transform(category.begin(), category.end(), category.begin(), [](unsigned char c){ return std::tolower(c); });
                                
                                std::string key = category + ":" + word;
                                cache_[key] = valid;

                                std::cout << "[GeminiValidator] Word validation result: [" << category << "] \"" << word << "\" -> " << (valid ? "VALID" : "INVALID") << std::endl;

                                if (valid) {
                                    insertIntoLocalDb(category, word);
                                }
                            }
                        }
                    }
                }
            } else if (resp.contains("error")) {
                std::cerr << "[GeminiValidator] Gemini API error: " << resp["error"].value("message", "Unknown error") << std::endl;
            } else {
                std::cerr << "[GeminiValidator] Unexpected JSON structure: " << responseStr << std::endl;
            }
        } catch (const std::exception& e) {
            std::cerr << "[GeminiValidator] Exception parsing Gemini response: " << e.what() << std::endl;
            std::cerr << "[GeminiValidator] Raw Response: " << responseStr << std::endl;
        }
    }

    bool isCached(const std::string& category, const std::string& word, bool& outValid) const {
        std::string key = category + ":" + word;
        auto it = cache_.find(key);
        if (it != cache_.end()) {
            outValid = it->second;
            return true;
        }
        return false;
    }

private:
    GeminiValidator() = default;

    std::string apiKey_;
    std::unordered_map<std::string, bool> cache_; // category:word -> valid

    std::string loadApiKey() {
        char* val = std::getenv("GEMINI_API_KEY");
        if (val) return std::string(val);

        std::vector<std::string> paths = {
            ".env",
            "../.env",
            "../../.env",
            "../../../.env",
            "/home/petpooja/Documents/wordgame/.env"
        };

        for (const auto& path : paths) {
            std::ifstream file(path);
            if (file.is_open()) {
                std::string line;
                while (std::getline(file, line)) {
                    while (!line.empty() && (line.back() == '\r' || line.back() == '\n')) line.pop_back();
                    
                    size_t pos = line.find('=');
                    if (pos != std::string::npos) {
                        std::string k = line.substr(0, pos);
                        std::string v = line.substr(pos + 1);
                        
                        k.erase(0, k.find_first_not_of(" \t"));
                        k.erase(k.find_last_not_of(" \t") + 1);
                        v.erase(0, v.find_first_not_of(" \t\"'"));
                        v.erase(v.find_last_not_of(" \t\"'") + 1);
                        
                        if (k == "GEMINI_API_KEY") {
                            return v;
                        }
                    }
                }
            }
        }
        return "";
    }

    std::string executeCommand(const std::string& cmd) {
        std::string data;
#ifdef _WIN32
        FILE* stream = _popen(cmd.c_str(), "r");
#else
        FILE* stream = popen(cmd.c_str(), "r");
#endif
        if (stream) {
            char buffer[1024];
            while (fgets(buffer, sizeof(buffer), stream) != nullptr) {
                data.append(buffer);
            }
#ifdef _WIN32
            _pclose(stream);
#else
            pclose(stream);
#endif
        }
        return data;
    }

    void insertIntoLocalDb(const std::string& category, const std::string& word) {
        Dictionary::insertWord(category, word);
    }
};
