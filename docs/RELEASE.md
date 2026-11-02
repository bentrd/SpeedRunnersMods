Velo 2.4.41 and Steam overlay/recording support.

- Updated the bundled Mac port to Velo 2.4.41, port revision 2.
- Fixed Velo launches missing Steam's overlay hook. Shift+Tab and Steam game
  recording now work in the separate Velo installation.
- Detects the running Steam installation and validates the overlay's Intel
  architecture, including when the launcher itself runs on Apple Silicon.
- Displays and installs the Velo version pinned in the bundled manifest.
- Preserves Velo settings, scripts, recordings, and TAS projects on upgrade.

Requires Steam SpeedRunners. Download arm64 for Apple Silicon or x64 for Intel.
Apple Silicon uses Rosetta for the game. Quit the game before updating the app.

Steam recording follows your Steam settings: start/stop captures in Manual mode;
instant clips require background recording. If Steam uses F1 for clips, choose
another clip shortcut in Steam to keep Velo's F1 settings key available.

The app is ad-hoc signed, not notarized. If macOS blocks it or reports that it is
damaged, move **SpeedRunners Mods.app** into **Applications** and run:

```sh
xattr -dr com.apple.quarantine "/Applications/SpeedRunners Mods.app"
```

Velo's Windows audio capture and native leaderboard verifier remain unavailable;
verified run submissions are unsupported. See the repository's testing record
for verified behavior and remaining limits.
