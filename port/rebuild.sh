#!/bin/bash
# Rebuild the fixed Velo 2.4.40 Mac port; never write to the Steam game.
set -euo pipefail
cd "$(dirname "$0")/.."
GAME=${1:?Pass the unmodified Steam SpeedRunners.app path}
ARCHIVE=${2:-resources/port/Velo_2.4.40.zip}
GAME=$(cd "$GAME" && pwd)
ARCHIVE=$(cd "$(dirname "$ARCHIVE")" && pwd)/$(basename "$ARCHIVE")
printf '%s  %s\n' '65df3986199294739e7f3a201cf544ca4ea178a469fdcba697a5e8456bc59c2e' "$ARCHIVE" | shasum -a 256 -c -
mkdir -p .work/velo-original resources/port
unzip -oq "$ARCHIVE" -d .work/velo-original
dotnet build tools/Inspector -o .work/inspector -v quiet
dotnet .work/inspector/Inspector.dll .work/velo-original/Velo.dll > .work/velo-il.json
python3 port/patch_velo.py .work/velo-original/Velo.dll .work/velo-il.json .work/Velo.dll
dotnet run --project tools/SteamCompat -- "$GAME/Contents/Resources/Steamworks.NET.dll" .work/Steamworks.NET.dll
if [ ! -d .work/Velo_UI/.git ]; then git clone https://github.com/andrewmenden/Velo_UI .work/Velo_UI; fi
# The generated upstream checkout is disposable; our changes live in port/.
git -C .work/Velo_UI reset --hard b19df4051f1f7a949c128e87b216431edd06f1e9
git -C .work/Velo_UI submodule update --init --recursive
python3 port/prepare-native.py .work/Velo_UI
bash port/build-native.sh "$GAME"
bash port/build-lua.sh
python3 port/make-recipes.py "$GAME" "$ARCHIVE"
printf 'Port rebuilt in resources/port. Run npm test before packaging.\n'
