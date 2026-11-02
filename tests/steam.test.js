'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {discoverSteamRuntime, buildSteamEnvironment, isX64MachO} = require('../src/main/steam');

function thin(cpu = 0x01000007) {
  const header = Buffer.alloc(32);
  header.writeUInt32LE(0xfeedfacf, 0);
  header.writeUInt32LE(cpu, 4);
  return header;
}

function universal() {
  const header = Buffer.alloc(48);
  header.writeUInt32BE(0xcafebabe, 0);
  header.writeUInt32BE(2, 4);
  header.writeUInt32BE(0x0100000c, 8);
  header.writeUInt32BE(0x01000007, 28);
  return header;
}

async function fixture(fn) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sr-steam-'));
  try { await fn(root); } finally { await fs.rm(root, {recursive: true, force: true}); }
}

async function writeOverlay(directory, bytes = universal()) {
  await fs.mkdir(directory, {recursive: true});
  const file = path.join(directory, 'gameoverlayrenderer.dylib');
  await fs.writeFile(file, bytes);
  return file;
}

test('overlay architecture matches Intel game rather than launcher architecture', () => {
  assert.equal(isX64MachO(thin()), true);
  assert.equal(isX64MachO(universal()), true);
  assert.equal(isX64MachO(thin(0x0100000c)), false);
  assert.equal(isX64MachO(Buffer.from('not a library')), false);
  assert.equal(isX64MachO(universal().subarray(0, 25)), false);
});

test('live Steam executable discovery preserves spaces and takes precedence over defaults', async () => fixture(async root => {
  const liveDirectory = path.join(root, 'Live Steam.app/Contents/MacOS');
  const liveOverlay = await writeOverlay(liveDirectory);
  await writeOverlay(path.join(root, 'Steam.AppBundle/Steam/Contents/MacOS'));
  const calls = [];
  const run = async (command, args) => {
    calls.push([command, args]);
    if (command === '/usr/bin/pgrep') return {stdout: '210\n211\n'};
    return {stdout: path.join(liveDirectory, 'steam_osx') + '\n'};
  };
  const runtime = await discoverSteamRuntime({steamRoot: root, run});
  assert.equal(runtime.overlayPath, liveOverlay);
  assert.equal(runtime.source, 'running');
  assert.equal(runtime.clientExecutable, path.join(liveDirectory, 'steam_osx'));
  assert.deepEqual(calls[1][1], ['-ww', '-p', '210,211', '-o', 'comm=']);
}));

test('Steam.AppBundle fallback works when process inspection is unavailable', async () => fixture(async root => {
  const overlay = await writeOverlay(path.join(root, 'Steam.AppBundle/Steam/Contents/MacOS'), thin());
  const runtime = await discoverSteamRuntime({steamRoot: root, run: async () => { throw new Error('process unavailable'); }});
  assert.equal(runtime.overlayPath, overlay);
  assert.equal(runtime.source, 'installed');
}));

test('incompatible live overlay is skipped in favor of an Intel-compatible install', async () => fixture(async root => {
  const liveDirectory = path.join(root, 'Old Steam.app/Contents/MacOS');
  await writeOverlay(liveDirectory, thin(0x0100000c));
  const overlay = await writeOverlay(path.join(root, 'Steam.AppBundle/Steam/Contents/MacOS'));
  const run = async command => ({stdout: command === '/usr/bin/pgrep' ? '210\n' : path.join(liveDirectory, 'steam_osx') + '\n'});
  assert.equal((await discoverSteamRuntime({steamRoot: root, run})).overlayPath, overlay);
}));

test('child environment injects the overlay once and preserves existing libraries', () => {
  const overlayPath = '/Live Steam.app/Contents/MacOS/gameoverlayrenderer.dylib';
  const base = {
    PATH: '/usr/bin',
    SteamAppId: 'other-game',
    DYLD_INSERT_LIBRARIES: `/custom hook.dylib:${overlayPath}:/custom hook.dylib`,
    DYLD_LIBRARY_PATH: '/existing/libs:/game/Resources'
  };
  const snapshot = {...base};
  const env = buildSteamEnvironment(base, {overlayPath, resPath: '/game/Resources', macOSPath: '/game/MacOS/osx'});
  assert.deepEqual(base, snapshot);
  assert.equal(env.PATH, '/usr/bin');
  assert.equal(env.SteamAppId, '207140');
  assert.equal(env.SteamGameId, '207140');
  assert.equal(env.SteamOverlayGameId, '207140');
  assert.equal(env.FNA3D_FORCE_DRIVER, 'OpenGL');
  assert.equal(env.DYLD_INSERT_LIBRARIES, `${overlayPath}:/custom hook.dylib`);
  assert.equal(env.DYLD_LIBRARY_PATH, '/game/Resources:/game/MacOS/osx:/existing/libs');
});

test('missing overlay or game paths fail before spawning a game without recording hooks', () => {
  assert.throws(() => buildSteamEnvironment({}, {overlayPath: 'relative.dylib', resPath: '/game', macOSPath: '/native'}), /absolute Steam overlay path/);
  assert.throws(() => buildSteamEnvironment({}, {overlayPath: '/overlay.dylib', resPath: 'relative', macOSPath: '/native'}), /Absolute game library paths/);
});
