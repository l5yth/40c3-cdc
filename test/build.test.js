// SPDX-FileCopyrightText: 2026 l5yth
// SPDX-License-Identifier: CC0-1.0
//
// To the extent possible under law, the author(s) have dedicated all copyright
// and related and neighboring rights to this software to the public domain
// worldwide. This software is distributed without any warranty.
//
// You should have received a copy of the CC0 Public Domain Dedication along
// with this software. If not, see
// <https://creativecommons.org/publicdomain/zero/1.0/>.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  compareEmbeds,
  compareStills,
  generateEmbeds,
  main,
  stillNames,
  writeEmbeds,
  writePngStills,
} from '../src/build.js';

/**
 * Create a repository root that holds only what the build reads.
 *
 * @returns {string} The directory.
 */
function fixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), 'cdc-build-'));
  mkdirSync(join(root, 'assets/logo'), { recursive: true });
  mkdirSync(join(root, 'assets/pattern/SVG'), { recursive: true });
  cpSync('assets/logo/CDC_LogoText_5.svg', join(root, 'assets/logo/CDC_LogoText_5.svg'));
  for (const name of ['Pattern4', 'Pattern5', 'Pattern6']) {
    cpSync(`assets/pattern/SVG/${name}.svg`, join(root, `assets/pattern/SVG/${name}.svg`));
  }
  mkdirSync(join(root, 'designs'));
  const fonts = 'upstream/40c3-styleguide/fonts';
  mkdirSync(join(root, fonts), { recursive: true });
  for (const name of [
    'Hack-Regular.woff2',
    'Hack-Bold.woff2',
    'jersey-10-latin-400-normal.woff2',
  ]) {
    cpSync(join(fonts, name), join(root, fonts, name));
  }
  return root;
}

/**
 * Read the size of a PNG file.
 *
 * @param {string} path - The file.
 * @returns {number[]} Width and height.
 */
function pngSize(path) {
  const png = readFileSync(path);
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
}

test('generateEmbeds makes every SVG of ACCEPTANCE C1', () => {
  const names = [...generateEmbeds('.').keys()];
  assert.equal(names.length, 27);
  for (const name of [
    'typewriter-5.svg',
    'blink-B-transparent.svg',
    'banner-A.svg',
    'banner-B-still.svg',
    'conveyor-B.svg',
    'conveyor-5-transparent.svg',
    'strip-A.svg',
  ]) {
    assert.ok(names.includes(name), name);
  }
  assert.deepEqual(
    names.filter((name) => /-0[-.]/.test(name)),
    [],
    'green is off brand',
  );
});

test('stillNames picks the banner stills and the strips', () => {
  const names = stillNames(generateEmbeds('.'));
  assert.equal(names.length, 6);
  assert.ok(names.includes('banner-5-still.svg'));
  assert.ok(names.includes('strip-B.svg'));
  assert.ok(!names.includes('banner-5.svg'));
});

test('writePngStills renders at twice the size and removes stale PNG files', () => {
  const dir = join(mkdtempSync(join(tmpdir(), 'cdc-build-')), 'embed');
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 5"><rect width="10" height="5"/></svg>';
  const files = new Map([['strip-A.svg', svg]]);
  writeEmbeds(dir, files);
  writeFileSync(join(dir, 'old.png'), 'x');
  writePngStills(dir, files);
  assert.deepEqual(readdirSync(dir).sort(), ['strip-A.png', 'strip-A.svg']);
  assert.deepEqual(pngSize(join(dir, 'strip-A.png')), [20, 10]);
});

test('compareEmbeds reports a missing PNG still', () => {
  const dir = join(mkdtempSync(join(tmpdir(), 'cdc-build-')), 'embed');
  const files = new Map([['strip-A.svg', 'x']]);
  writeEmbeds(dir, files);
  assert.deepEqual(compareEmbeds(dir, files), ['missing file: strip-A.png']);
});

test('compareEmbeds reports a stray PNG', () => {
  const dir = join(mkdtempSync(join(tmpdir(), 'cdc-build-')), 'embed');
  writeEmbeds(dir, new Map());
  writeFileSync(join(dir, 'extra.png'), 'x');
  assert.deepEqual(compareEmbeds(dir, new Map()), ['stale file: extra.png']);
});

test('compareStills passes on a fresh build and names a replaced PNG', () => {
  const root = fixtureRoot();
  main(['--root', root]);
  const dir = join(root, 'embed');
  const files = generateEmbeds(root);
  assert.deepEqual(compareStills(dir, files), []);
  cpSync(join(dir, 'strip-A.png'), join(dir, 'strip-5.png'));
  assert.deepEqual(compareStills(dir, files), ['differs from a fresh build: strip-5.png']);
  assert.equal(main(['--check', '--root', root]), 1);
});

test('compareStills leaves a missing PNG to compareEmbeds', () => {
  const dir = join(mkdtempSync(join(tmpdir(), 'cdc-build-')), 'embed');
  const files = new Map([['strip-A.svg', 'x']]);
  writeEmbeds(dir, files);
  assert.deepEqual(compareStills(dir, files), []);
});

test('main renders the stills at the documented sizes', () => {
  const root = fixtureRoot();
  main(['--root', root]);
  assert.deepEqual(pngSize(join(root, 'embed/banner-5-still.png')), [1360, 662]);
  assert.deepEqual(pngSize(join(root, 'embed/strip-A.png')), [2280, 210]);
});

test('generateEmbeds is deterministic', () => {
  const first = generateEmbeds('.');
  const second = generateEmbeds('.');
  assert.deepEqual([...first], [...second]);
});

test('writeEmbeds creates files, replaces stale SVGs and keeps other files', () => {
  const dir = join(mkdtempSync(join(tmpdir(), 'cdc-build-')), 'embed');
  writeEmbeds(dir, new Map([['old.svg', 'x']]));
  writeFileSync(join(dir, 'still.png'), 'png');
  writeEmbeds(dir, new Map([['new.svg', 'y']]));
  assert.deepEqual(readdirSync(dir).sort(), ['new.svg', 'still.png']);
});

test('compareEmbeds names stale, missing and changed files', () => {
  const dir = join(mkdtempSync(join(tmpdir(), 'cdc-build-')), 'embed');
  writeEmbeds(
    dir,
    new Map([
      ['stale.svg', 'x'],
      ['changed.svg', 'old'],
    ]),
  );
  const problems = compareEmbeds(
    dir,
    new Map([
      ['changed.svg', 'new'],
      ['missing.svg', 'z'],
    ]),
  );
  assert.deepEqual(problems.sort(), [
    'differs from a fresh build: changed.svg',
    'missing file: missing.svg',
    'stale file: stale.svg',
  ]);
});

test('compareEmbeds reports nothing for identical files', () => {
  const dir = join(mkdtempSync(join(tmpdir(), 'cdc-build-')), 'embed');
  const files = new Map([['a.svg', 'x']]);
  writeEmbeds(dir, files);
  assert.deepEqual(compareEmbeds(dir, files), []);
});

test('compareEmbeds treats a missing directory as all files missing', () => {
  const dir = join(tmpdir(), 'cdc-build-no-such-directory');
  assert.deepEqual(compareEmbeds(dir, new Map([['a.svg', 'x']])), ['missing file: a.svg']);
});

test('main writes the embeds and a later check passes', () => {
  const root = fixtureRoot();
  assert.equal(main(['--root', root]), 0);
  assert.ok(existsSync(join(root, 'embed/typewriter-5.svg')));
  assert.equal(main(['--check', '--root', root]), 0);
});

test('main --check fails on a changed file', () => {
  const root = fixtureRoot();
  main(['--root', root]);
  appendFileSync(join(root, 'embed/blink-5.svg'), ' ');
  assert.equal(main(['--check', '--root', root]), 1);
});

test('main defaults to the repository root', () => {
  assert.equal(main(['--check']), 0);
});

test('the command line runs the build', () => {
  const root = fixtureRoot();
  const result = spawnSync(process.execPath, ['src/build.js', '--root', root], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(existsSync(join(root, 'embed/blink-A.svg')));
  rmSync(root, { recursive: true });
});
