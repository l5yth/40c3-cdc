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

// Layer D of ACCEPTANCE.md for banner and conveyor.

import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { launch, near, serve, sleep } from './lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CORAL = [0xea, 0x6f, 0x82];
const DARK = [0x00, 0x13, 0x00];
const NEUTRAL = [0xeb, 0xed, 0xf0];
const WHITE = [255, 255, 255];
const STEP = 60000 / 570;

/** @type {Awaited<ReturnType<typeof launch>>} */
let browser;
/** @type {Awaited<ReturnType<typeof serve>>} */
let server;

before(async () => {
  server = await serve(ROOT, {
    '/__img.html':
      '<!doctype html><style>html,body{margin:0}</style><img id="i" alt="" width="1140">',
  });
  browser = await launch();
});

after(async () => {
  browser.close();
  await server.close();
});

/**
 * Compare a region of two frames after a horizontal shift to the left.
 *
 * @param {import('./lib.mjs').Frame} before - The earlier frame.
 * @param {import('./lib.mjs').Frame} later - The later frame.
 * @param {number} shift - Pixels the content moved to the left.
 * @param {{left: number, top: number, right: number, bottom: number}} box - Region of the later frame.
 * @returns {void}
 */
function assertShifted(before, later, shift, box) {
  for (let y = box.top; y < box.bottom; y += 1) {
    for (let x = box.left; x < box.right - shift; x += 1) {
      assert.deepEqual(later.at(x, y), before.at(x + shift, y), `pixel ${x},${y}`);
    }
  }
}

test('D3: banner layout, colors and rolling strip', async () => {
  await browser.viewport(680, 331);
  const file = '/embed/banner-5.svg';
  const frame = await browser.seek(server.origin, file, 52);
  for (const [x, y] of [
    [1, 165],
    [678, 165],
    [340, 1],
    [340, 329],
  ]) {
    assert.ok(near(frame.at(x, y), CORAL, 2), `border at ${x},${y}`);
  }
  assert.ok(near(frame.at(20, 20), DARK, 0), 'ground');
  const lockup = { left: 2, top: 42, right: 678, bottom: 192 };
  const strip = { left: 2, top: 224, right: 678, bottom: 329 };
  assert.ok(frame.count(lockup, CORAL) > 0, 'coral lockup');
  assert.ok(frame.count(strip, NEUTRAL) > 0, 'neutral strip');
  assert.equal(frame.count(strip, CORAL), 0, 'no coral in the strip');
  const shifted = await browser.seek(server.origin, file, 52 + STEP * 10);
  assertShifted(frame, shifted, 20, strip);
  const looped = await browser.seek(server.origin, file, 60052);
  assert.deepEqual(looped.data, frame.data, 'the loop closes');
});

test('D4: conveyor rolls in 2 unit steps, loops and joins its seams', async () => {
  await browser.viewport(1140, 105);
  const file = '/embed/conveyor-A.svg';
  const frame = await browser.seek(server.origin, file, 52);
  const pixel = frame.at(5, 103);
  assert.ok(near(pixel, DARK) || near(pixel, NEUTRAL), `only ground or ink, got ${pixel}`);
  const all = { left: 0, top: 0, right: 1140, bottom: 105 };
  const shifted = await browser.seek(server.origin, file, 52 + STEP * 10);
  assertShifted(frame, shifted, 20, all);
  const looped = await browser.seek(server.origin, file, 60052);
  assert.deepEqual(looped.data, frame.data, 'the loop closes');
  for (const seam of [380, 760]) {
    for (const x of [seam - 1, seam, seam + 1]) {
      assert.ok(near(frame.at(x, 12), NEUTRAL), `seam at ${x}`);
    }
  }
});

test('D5: the transparent conveyor leaves the page visible', async () => {
  await browser.viewport(1140, 105);
  const frame = await browser.seek(server.origin, '/embed/conveyor-A-transparent.svg', 52);
  assert.deepEqual(frame.at(2, 60), WHITE);
});

for (const file of ['/embed/banner-5.svg', '/embed/conveyor-A.svg']) {
  test(`D7: ${file} runs inside an img tag`, async () => {
    await browser.viewport(1140, 600);
    await browser.goto(`${server.origin}/__img.html`);
    await browser.evaluate(`document.getElementById('i').src = ${JSON.stringify(file)}; null`);
    await browser.waitFor(`document.getElementById('i').complete`);
    const first = await browser.screenshot();
    await sleep(1500);
    const second = await browser.screenshot();
    assert.notDeepEqual(first.data, second.data);
  });
}
