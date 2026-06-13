cmake_minimum_required(VERSION 3.16)
project(ThinkAndTypeServer VERSION 1.0.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(FetchContent)

# 1. Standalone Asio
FetchContent_Declare(
    asio
    GIT_REPOSITORY https://github.com/chriskohlhoff/asio.git
    GIT_TAG        asio-1-28-0
)
FetchContent_MakeAvailable(asio)

# Expose ASIO_INCLUDE_DIR globally to satisfy Crow's Findasio.cmake
set(ASIO_INCLUDE_DIR "${asio_SOURCE_DIR}/asio/include" CACHE PATH "Path to Asio include" FORCE)

find_package(Threads REQUIRED)

add_library(asio_lib INTERFACE)
target_include_directories(asio_lib INTERFACE 
    ${asio_SOURCE_DIR}/asio/include
)
target_compile_definitions(asio_lib INTERFACE 
    ASIO_STANDALONE 
)
target_link_libraries(asio_lib INTERFACE 
    Threads::Threads
)

# 2. nlohmann_json
FetchContent_Declare(
    nlohmann_json
    GIT_REPOSITORY https://github.com/nlohmann/json.git
    GIT_TAG        v3.11.2
)
FetchContent_MakeAvailable(nlohmann_json)

# 3. Crow C++ (v1.3.2 where Boost is optional)
set(CROW_USE_BOOST OFF CACHE BOOL "Use boost" FORCE)
set(CROW_FEATURES "" CACHE STRING "Disabled features" FORCE)
FetchContent_Declare(
    Crow
    GIT_REPOSITORY https://github.com/CrowCpp/Crow.git
    GIT_TAG        v1.3.2
)
FetchContent_MakeAvailable(Crow)

# Now, target definition
add_executable(think-and-type-server 
  src/main.cpp
  src/sqlite3.c
)

target_include_directories(think-and-type-server PRIVATE
  src
)

target_link_libraries(think-and-type-server PRIVATE
  Crow::Crow
  asio_lib
  nlohmann_json::nlohmann_json
)

if(WIN32)
  target_link_libraries(think-and-type-server PRIVATE ws2_32 mswsock)
endif()
