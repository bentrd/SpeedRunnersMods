'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');

const exec = promisify(execFile);
const CPU_TYPE_X86_64 = 0x01000007;
const defaultSteam = path.join(os.homedir(), 'Library/Application Support/Steam');

// The game uses Intel Mono under Rosetta, even when the launcher is native arm64.
// Inspect the header directly so launching never requires Xcode's lipo utility.
function isX64MachO(header) {
  if (!Buffer.isBuffer(header) || header.length < 8) return false;
  const magic = header.readUInt32BE(0);
  if (magic === 0xcffaedfe || magic === 0xcefaedfe) {
    return header.readUInt32LE(4) === CPU_TYPE_X86_64;
  }
  if (magic === 0xfeedfacf || magic === 0xfeedface) {
    return header.readUInt32BE(4) === CPU_TYPE_X86_64;
  }
  const bigEndian = magic === 0xcafebabe || magic === 0xcafebabf;
  const littleEndian = magic === 0xbebafeca || magic === 0xbfbafeca;
  if (!bigEndian && !littleEndian) return false;
  const read32 = offset => bigEndian ? header.readUInt32BE(offset) : header.readUInt32LE(offset);
  const count = read32(4);
  const entrySize = magic === 0xcafebabf || magic === 0xbfbafeca ? 32 : 20;
  if (count < 1 || count > 128 || 8 + count * entrySize > header.length) return false;
  for (let index = 0; index < count; index++) {
    if (read32(8 + index * entrySize) === CPU_TYPE_X86_64) return true;
  }
  return false;
}

async function usableOverlay(file) {
  let handle;
  try {
    handle = await fs.open(file, 'r');
    const header = Buffer.alloc(4096);
    const {bytesRead} = await handle.read(header, 0, header.length, 0);
    return isX64MachO(header.subarray(0, bytesRead));
  } catch {
    return false;
  } finally {
    if (handle) await handle.close();
  }
}

/** Find the installed client's own overlay rather than assuming /Applications. */
async function discoverSteamRuntime({steamRoot = defaultSteam, run = exec} = {}) {
  const directories = [];
  try {
    const {stdout} = await run('/usr/bin/pgrep', ['-x', 'steam_osx'], {timeout: 5000, maxBuffer: 65536});
    const pids = stdout.trim().split(/\s+/).filter(pid => /^\d+$/.test(pid));
    if (pids.length) {
      const result = await run('/bin/ps', ['-ww', '-p', pids.join(','), '-o', 'comm='], {timeout: 5000, maxBuffer: 65536});
      for (const line of result.stdout.split('\n')) {
        const executable = line.trim();
        if (path.isAbsolute(executable) && path.basename(executable) === 'steam_osx') {
          directories.push({directory: path.dirname(executable), executable, source: 'running'});
        }
      }
    }
  } catch {
    // Process inspection can be unavailable; known install layouts remain usable.
  }
  directories.push(
    {directory: path.join(steamRoot, 'Steam.AppBundle/Steam/Contents/MacOS'), source: 'installed'},
    {directory: path.join(steamRoot, 'Steam.app/Contents/MacOS'), source: 'installed'},
    {directory: steamRoot, source: 'installed'},
    {directory: '/Applications/Steam.app/Contents/MacOS', source: 'installed'}
  );
  const visited = new Set();
  for (const candidate of directories) {
    if (visited.has(candidate.directory)) continue;
    visited.add(candidate.directory);
    const overlayPath = path.join(candidate.directory, 'gameoverlayrenderer.dylib');
    if (await usableOverlay(overlayPath)) {
      return {binDirectory: candidate.directory, overlayPath, clientExecutable: candidate.executable || path.join(candidate.directory, 'steam_osx'), source: candidate.source};
    }
  }
  throw new Error('Steam’s Intel overlay library was not found. Open or reinstall Steam, then launch Velo again.');
}

function mergeLibraryPaths(required, existing) {
  return [...new Set([...required, ...(existing || '').split(':')].filter(Boolean))].join(':');
}

/** Apply injection to the child game only; never modify Steam or global settings. */
function buildSteamEnvironment(baseEnv, {overlayPath, resPath, macOSPath, appId = '207140'}) {
  if (!path.isAbsolute(overlayPath || '')) throw new Error('An absolute Steam overlay path is required.');
  if (!path.isAbsolute(resPath || '') || !path.isAbsolute(macOSPath || '')) throw new Error('Absolute game library paths are required.');
  return {
    ...baseEnv,
    SteamAppId: String(appId),
    SteamGameId: String(appId),
    SteamOverlayGameId: String(appId),
    FNA3D_FORCE_DRIVER: 'OpenGL',
    DYLD_INSERT_LIBRARIES: mergeLibraryPaths([overlayPath], baseEnv.DYLD_INSERT_LIBRARIES),
    DYLD_LIBRARY_PATH: mergeLibraryPaths([resPath, macOSPath], baseEnv.DYLD_LIBRARY_PATH)
  };
}

module.exports = {discoverSteamRuntime, buildSteamEnvironment, isX64MachO};
