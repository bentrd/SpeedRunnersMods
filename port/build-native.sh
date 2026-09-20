#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=.work/Velo_UI
GAME=${1:?Pass the Steam SpeedRunners.app path}
mkdir -p resources/port
clang++ -std=c++20 -arch x86_64 -mmacosx-version-min=10.15 -dynamiclib -O2 -w \
 -I "$SRC" -I "$SRC/external/json" -I "$SRC/external/imgui" -I "$SRC/external/imgui/backends" -I "$SRC/external/SDL2/include" \
 port/dllmain_macos.cpp "$SRC"/external/imgui/imgui*.cpp "$SRC/external/imgui/backends/imgui_impl_opengl3.cpp" "$SRC/external/imgui/backends/imgui_impl_sdl2.cpp" \
 "$GAME/Contents/MacOS/osx/libSDL2-2.0.0.dylib" -framework OpenGL -o resources/port/libVelo_UI.dylib
install_name_tool -id @rpath/libVelo_UI.dylib resources/port/libVelo_UI.dylib
codesign --force --sign - resources/port/libVelo_UI.dylib
