# SpeedRunners Mods for Mac

A small Electron launcher for **vanilla SpeedRunners** and **Velo 2.4.40**.
Choose Launch Vanilla or Launch Velo. Velo lives in a separate installation; Steam's
original game is never patched. No general-purpose mod framework.

## Install

Download the macOS release for your Mac (arm64 for Apple Silicon, x64 for Intel),
extract it, and drag **SpeedRunners Mods.app** into Applications. You need an
installed Steam copy of SpeedRunners. Sign into Steam and choose Launch Velo. The tested Velo version is included. The first launch prepares a separate
copy of your local game with the bundled, checksum-locked Mac fixes. No .NET SDK, Mono installation, Homebrew, or compiler is needed by users.
The Intel game still uses Rosetta on Apple Silicon.

This initial release is ad-hoc signed, not Apple-notarized. macOS may require
allowing the downloaded app in System Settings → Privacy & Security.

- **Vanilla** launches through Steam, honoring Steam launch options and cloud saves.
- **Velo** launches the separate Mac port. F1 opens settings; F2 opens the leaderboard.
- **Settings** locates the game, opens the Velo folder and logs, and checks for updates.
- The menu uses the actual game background, logo, and font, decoded from your local
  Steam installation. Missing artwork falls back to the game name.

Data lives in `~/Library/Application Support/SpeedRunners Mods/`. Reinstalling Velo
preserves its settings, scripts, recordings, and TAS projects. Normal game saves
are still handled by SpeedRunners/Steam. Exit the game before switching modes.

## Port scope

The Mac port includes native OpenGL/SDL settings UI, Lua 5.4, Windows time API
compatibility, Unix paths and settings persistence fixes, fallback font fixes,
and Steam authentication compatibility methods. It uses SpeedRunners' bundled
Intel Mono runtime and native Steam/FNA libraries.

Velo's Windows updater is disabled. Only a tested port should replace these files.
The launcher checks GitHub releases and offers a checksum-verified app update,
with bundle identity validation and rollback if the replacement cannot launch.
An old app backup is retained beside the installed app in a hidden update directory.

Known limitations:

- Velo's proprietary Windows native verifier and Windows audio loopback capture
  are unavailable. Browsing leaderboards works; verified run submissions are
  unsupported and auto-submissions are disabled on installation.
- Steam multiplayer authentication is preserved. Ranked match outcomes and
  remote server acceptance require their own live testing; no guards are bypassed.
- Velo updates ship only after a new Mac port has been prepared and tested. There is no arbitrary mod import.
- x64 builds are provided for Intel Macs, but hardware validation is performed on
  Apple Silicon using Rosetta for the game.

## Development

```sh
npm ci
npm test
npm start
npm run dist:mac
```

Bundled compatibility files are in `resources/port`. See [PORTING.md](docs/PORTING.md)
for reproducible rebuilds and [TESTING.md](docs/TESTING.md) for the actual validation
record. Tagging `v*` triggers macOS-only packaging. The app includes the pinned
Velo mod archive and compatibility files; a full Steam game installation is still required.

Inspired by [GambonanzaMods](https://github.com/bentrd/GambonanzaMods).
Velo is by rbit, olsu, and doodlezucc. Its UI bridge is adapted from
[andrewmenden/Velo_UI](https://github.com/andrewmenden/Velo_UI), pinned at
`b19df4051f1f7a949c128e87b216431edd06f1e9`.
SpeedRunners and its artwork belong to DoubleDutch Games and tinyBuild.
See [third-party notices](docs/THIRD-PARTY.md).
