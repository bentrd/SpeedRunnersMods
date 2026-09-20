First macOS release of SpeedRunners Mods.

- Launch vanilla SpeedRunners through Steam or the isolated Velo 2.4.40 Mac port.
- Velo is included: choose Launch Velo. No ZIP import or development tools.
- Native Mac settings renderer, Steam auth compatibility, Lua, and persistent settings.
- SpeedRunners’ actual menu background, logo, font, and application icon.
- Automatic update checks and checksum-verified app replacement with rollback.

Requires Steam SpeedRunners. Apple Silicon uses
Rosetta for the game. Download arm64 for Apple Silicon or x64 for Intel.

The app is ad-hoc signed, not notarized. If macOS blocks it or reports that it is
damaged, move **SpeedRunners Mods.app** into **Applications** and run this in Terminal:

```sh
xattr -dr com.apple.quarantine "/Applications/SpeedRunners Mods.app"
```

This removes the download quarantine attribute only from this app and its contents.
Open the app again afterward.

Velo's Windows audio capture and native leaderboard verifier are unavailable;
verified run submissions are unsupported.
See the repository's testing record for verified behavior and remaining limits.
