# Validation record

Tested on 20 September 2026, Apple M2, macOS, Steam SpeedRunners 207140.
The game and native Velo libraries run as Intel code through Rosetta.

## Completed

- Vanilla game launched through Steam and rendered its main menu.
- Velo 2.4.40 booted using the game's embedded Mono runtime with working Steam init.
- Reproduced and fixed the unsupported GLSL version error, black game background
  after opening F1, and corrupted F2 leaderboard render.
- Visually inspected both overlays: F1 settings over a correctly rendered game,
  and F2 Top Runs with readable fonts, avatars, and entries. Temporary diagnostic
  auto-open patches were confined to the development test copy and are absent
  from the bundled production Velo recipe.
- User subsequently tested the game and reported that it was working.
- Fresh bundled installation through the launcher reached the Velo main menu,
  without a ZIP picker or any developer tools.
- Closing the game returned the launcher to its available launch state.
- The native macOS icon lookup caused an Electron worker SIGTRAP. Removed that
  lookup; the app now uses file-based icon assets. No recurrence in subsequent launches.
- Read game XNB textures directly and verified the actual sky, city, logo, and
  font render in the launcher. UI uses the game's text menu and angular settings panel.
- The documented `port/rebuild.sh` completed from the pinned source checkout.
- Six unit tests cover patch integrity, binary deltas, unsafe archives, updater
  version/architecture selection, shell quoting/rollback, and failed-install isolation.
- Integration test installs the bundled archive twice, verifies the exact patched
  DLL checksum, preserves a user data marker, verifies submissions stay disabled,
  and verifies Steam's executable, FNA, and Steamworks assemblies remain unchanged.

- Built both arm64 and x64 macOS ZIP/DMG artifacts; deep, strict ad-hoc signature
  verification passed. Installed the arm64 app into Applications and verified its
  bundled game menu, font, artwork, icon, Settings entry, and Quit behavior.

## Checks to reproduce

```sh
npm ci
npm test
SPEEDRUNNERS_TEST_GAME='/path/to/SpeedRunners.app' npm test
npm run dist:mac
```

The integration test is skipped on CI without a licensed local game. Packaging
creates only macOS app ZIP/DMG files and verifies the ad-hoc bundle signatures.

## Limits

No Intel hardware test, live ranked match, verified leaderboard submission,
Windows loopback audio, or exhaustive Lua/TAS/replay scenario is claimed.
The verifier and audio features are unavailable on this port. Automated function
key delivery was unreliable; the user performed the final interactive game check.
App updates require a published GitHub release with its SHA-256 asset digest.
The app is ad-hoc signed and has no Apple notarization ticket.
