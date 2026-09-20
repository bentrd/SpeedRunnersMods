# Rebuilding the Velo Mac port

The launcher ships a single reviewed Velo 2.4.40 version. End users need only
Steam's Mac SpeedRunners installation and Rosetta on Apple Silicon. They do not
import arbitrary Windows mods. Velo's Windows updater is disabled; new versions
must be ported, tested, and released with this app.

## Reproduce

On macOS, install Xcode command-line tools, Python 3, and .NET SDK 9. Git and curl
are used to fetch the pinned native sources. The project includes the required
MIT Mono System.Windows.Forms.dll; rebuilding that upstream assembly is optional.

```sh
npm ci
bash port/rebuild.sh '/path/to/Steam/SpeedRunners.app'
npm test
npm run dist:mac
```

The script verifies the bundled upstream ZIP, inspects Velo's IL with read-only
Mono.Cecil, applies same-length byte edits, builds the Steam compatibility delta,
and builds Intel native UI and Lua libraries. The Intel game loads Intel libraries
even when the Electron launcher is arm64. It never writes into the Steam app.

The `.work/Velo_UI` generated checkout is reset to its pinned revision by rebuild.
Keep authored edits in `port/`, not that generated directory. .NET may produce
non-identical module metadata on different runs; the generated output hash is
recorded in the Steam recipe and validated by the installer.

## Sources and recipes

- Velo 2.4.40 archive SHA-256:
  `65df3986199294739e7f3a201cf544ca4ea178a469fdcba697a5e8456bc59c2e`.
- UI: `andrewmenden/Velo_UI`, revision `b19df4051f1f7a949c128e87b216431edd06f1e9`.
  Its pinned submodules supply Dear ImGui and SDL headers; SDL itself comes from the game.
- Lua 5.4.8: official lua.org source, SHA-256
  `4f18ddae154e793e46eeab727c59ef1c0c0c2b744e7b94219710d76f530629ae`.
- Steam compatibility targets the game's Steamworks.NET 2025.162.1 assembly.
  `steam-patch.json` includes its required input hash. A different game wrapper
  is rejected before installation; it needs a new reviewed recipe.
- `velo-patch.json` records every byte change, reason, and before/after hashes.

## Managed changes

`patch_velo.py` keeps the DLL size and metadata layout unchanged. This avoids
rewriting protected/obfuscated game assemblies with a general IL writer.

Patches select OpenGL, normalize Windows paths (including script startup paths),
fix serialization affected by the shared path separator string, simplify fallback
font style indexing, save settings immediately, and remove the Windows VC runtime
check, Windows updater, and shutdown callback that failed under the game Mono.
The necessary WinForms assembly resolves metadata references; no WinForms window
is created. No online, anti-cheat, or ranked guards are removed.

`tools/SteamCompat` adds two legacy method signatures Velo expects: a stats-request
shim and the old authentication-ticket overload, forwarded to the current API.
Only the separate modded game receives this assembly.

## Native renderer

`prepare-native.py` removes Win32/D3D dependencies from the pinned UI headers.
`dllmain_macos.cpp` implements SDL keyboard access, timing shims, and the ImGui
OpenGL bridge. `Velo.dll.config` maps Windows DLL imports to that bridge.

The game uses OpenGL 2.1 / GLSL 120 on the tested Apple M2. GLSL 150 fails. Save and
restore full OpenGL server/client state, program, framebuffer, renderbuffer, and
active texture around the UI: otherwise F1 leaves a black game background and
F2's leaderboard becomes corrupted. ImGui's framebuffer scale is 1 for FNA's
render target, despite the Retina window scale. These fixes are essential.

`KeraLua.dll.config` maps Lua imports to the bundled Intel Lua 5.4 library.
Windows loopback audio is unavailable. The proprietary Windows leaderboard
verifier is not replaced; installation disables automatic run submissions.

## Installation and future updates

The app validates the supplied bundled archive and recipes, clones the Steam game
into a staging directory, applies the port, preserves the previous Velo data
folder, then swaps the staged installation into place with rollback on failure.
The original game remains the source for vanilla launches through Steam.

For a new upstream version, review IL and imports again, increment the port
revision, rebuild the recipes, and repeat the testing record. Do not simply
replace the ZIP or enable upstream automatic updates.
