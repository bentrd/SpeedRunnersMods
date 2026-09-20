#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .work resources/port
curl -fL https://www.lua.org/ftp/lua-5.4.8.tar.gz -o .work/lua-5.4.8.tar.gz
printf '%s\n' '4f18ddae154e793e46eeab727c59ef1c0c0c2b744e7b94219710d76f530629ae  .work/lua-5.4.8.tar.gz' | shasum -a 256 -c -
tar xzf .work/lua-5.4.8.tar.gz -C .work
sources=()
for f in .work/lua-5.4.8/src/*.c; do
 case "$f" in */lua.c|*/luac.c) ;; *) sources+=("$f");; esac
done
clang -arch x86_64 -mmacosx-version-min=10.15 -dynamiclib -O2 -DLUA_USE_MACOSX "${sources[@]}" -o resources/port/liblua54.dylib
install_name_tool -id @rpath/liblua54.dylib resources/port/liblua54.dylib
codesign --force --sign - resources/port/liblua54.dylib
