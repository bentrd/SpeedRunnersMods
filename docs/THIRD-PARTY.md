# Third-party components

- **SpeedRunners**: DoubleDutch Games / tinyBuild. The full game and menu textures and font are read from the user's installation. The app icon uses the game's icon.
- **Velo 2.4.40**: rbit, olsu, doodlezucc. The pinned upstream mod ZIP is
  included with the launcher and receives the reviewed Mac compatibility patches.
  The original mod remains the work of its authors; it is not relicensed as MIT.
- **Velo_UI**: andrewmenden/Velo_UI at b19df4051f1f7a949c128e87b216431edd06f1e9.
  The native bridge is built against upstream settings UI code. The upstream
  repository does not provide a license file; its code is not relicensed by this project's MIT license.
- **Dear ImGui**: Omar Cornut and contributors, MIT; [license](licenses/ImGui.txt).
- **Lua 5.4.8**: Lua.org, PUC-Rio, MIT; [readme and license](licenses/Lua-readme.html).
- **Mono System.Windows.Forms**: Mono contributors, MIT; [license](licenses/Mono.txt).
- **Steamworks.NET**: Riley Labrecque and contributors, MIT; [license](licenses/Steamworks.NET.txt).
  Compatibility delta targets the user's existing 2025.162.1 wrapper.
- **SDL2** is dynamically linked from the user's game, not bundled by this project.
- **Electron** and **adm-zip** retain their package licenses; Electron's license
  and Chromium notices are included by electron-builder in the application.

- **xnb.js 1.3.0a**: Lybell / LeonBlade, LGPL-3.0-or-later. Loaded as a separate,
  unmodified npm library for decoding local XNB textures. [Source](https://github.com/lybell-art/xnb-js)
  and [license](licenses/xnb.txt). Matching source revision:
  `3249d8059364d830f91031280b3c8fc8ae4cc5bb`. Replace its files in the unpacked app module directory
  to use a modified compatible version. A matching source archive is included in notices.
