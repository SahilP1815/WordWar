# Distributed under the OSI-approved BSD 3-Clause License.  See accompanying
# file Copyright.txt or https://cmake.org/licensing for details.

cmake_minimum_required(VERSION 3.5)

file(MAKE_DIRECTORY
  "D:/New One/wordgame/WordWar/server/build_win/_deps/crow-src"
  "D:/New One/wordgame/WordWar/server/build_win/_deps/crow-build"
  "D:/New One/wordgame/WordWar/server/build_win/_deps/crow-subbuild/crow-populate-prefix"
  "D:/New One/wordgame/WordWar/server/build_win/_deps/crow-subbuild/crow-populate-prefix/tmp"
  "D:/New One/wordgame/WordWar/server/build_win/_deps/crow-subbuild/crow-populate-prefix/src/crow-populate-stamp"
  "D:/New One/wordgame/WordWar/server/build_win/_deps/crow-subbuild/crow-populate-prefix/src"
  "D:/New One/wordgame/WordWar/server/build_win/_deps/crow-subbuild/crow-populate-prefix/src/crow-populate-stamp"
)

set(configSubDirs Debug)
foreach(subDir IN LISTS configSubDirs)
    file(MAKE_DIRECTORY "D:/New One/wordgame/WordWar/server/build_win/_deps/crow-subbuild/crow-populate-prefix/src/crow-populate-stamp/${subDir}")
endforeach()
if(cfgdir)
  file(MAKE_DIRECTORY "D:/New One/wordgame/WordWar/server/build_win/_deps/crow-subbuild/crow-populate-prefix/src/crow-populate-stamp${cfgdir}") # cfgdir has leading slash
endif()
