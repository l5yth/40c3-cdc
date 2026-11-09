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

// Layer D of ACCEPTANCE.md for typewriter and blink.

import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { launch, mapper, near, serve, sleep } from './lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CORAL = [0xea, 0x6f, 0x82];
const DARK = [0x00, 0x13, 0x00];
const WHITE = [255, 255, 255];
const WIDTH = 1210;
const HEIGHT = 505;
const VIEWBOX = '-18.86 -18.86 302.52 126.14';
const toPixels = mapper(VIEWBOX, WIDTH, HEIGHT);

/** @type {Awaited<ReturnType<typeof launch>>} */
let browser;
/** @type {Awaited<ReturnType<typeof serve>>} */
let server;

before(async () => {
  server = await serve(ROOT, {
    '/__img.html':
      '<!doctype html><style>html,body{margin:0}</style><img id="i" alt="" width="800">',
  });
  browser = await launch();
  await browser.viewport(WIDTH, HEIGHT);
});

after(async () => {
  browser.close();
  await server.close();
});

/**
 * Describe the glyph area of a character cell.
 *
 * @param {number} line - Wordmark line.
 * @param {number} cell - Character cell.
 * @returns {{x: number, y: number, w: number, h: number}} Box in viewBox units.
 */
function cellBox(line, cell) {
  const [y, h] = line === 0 ? [33.5, 13.9] : [56.7, 14];
  return { x: 78.9 + 11.73 * cell, y, w: 11.73, h };
}

/**
 * Describe the cursor area at a character cell.
 *
 * @param {number} line - Wordmark line.
 * @param {number} cell - Character cell.
 * @returns {{x: number, y: number, w: number, h: number}} Box in viewBox units.
 */
function cursorBox(line, cell) {
  return { x: 78.9 + 11.73 * cell + 0.74, y: line === 0 ? 48.89 : 72.11, w: 9.37, h: 1.77 };
}

/**
 * List the probed character cells: all except the two underscores of line 1.
 *
 * @returns {{line: number, cell: number, index: number}[]} The cells.
 */
function probedCells() {
  const cells = [];
  for (let index = 0; index < 30; index += 1) {
    const line = index < 14 ? 0 : 1;
    const cell = index < 14 ? index : index - 14;
    if (!(line === 0 && (cell === 4 || cell === 13))) cells.push({ line, cell, index });
  }
  return cells;
}

/**
 * @param {import('./lib.mjs').Frame} frame - The screenshot.
 * @param {{x: number, y: number, w: number, h: number}} box - Box in viewBox units.
 * @param {number[]} [color] - Ink color.
 * @returns {number} Pixels of that color inside the box.
 */
function ink(frame, box, color = CORAL) {
  return frame.count(toPixels(box), color);
}

/**
 * @param {import('./lib.mjs').Frame} frame - The screenshot.
 * @param {number} x - Column in viewBox units.
 * @param {number} y - Row in viewBox units.
 * @returns {number[]} The pixel.
 */
function pixel(frame, x, y) {
  const { left, top } = toPixels({ x, y, w: 0, h: 0 });
  return frame.at(left, top);
}

const typewriterRows = [
  { t: 350, typed: 0, cursor: [0, 0] },
  { t: 1500, typed: 9, cursor: [0, 9] },
  { t: 1900, typed: 14, cursor: [1, 0] },
  { t: 3000, typed: 26, cursor: [1, 12] },
  { t: 3500, typed: 30, cursor: [1, 16] },
  { t: 4000, typed: 30, cursor: null },
  { t: 4500, typed: 30, cursor: [1, 16] },
  { t: 9100, typed: 30, cursor: null },
  { t: 9660, typed: 0, cursor: [0, 0] },
];

for (const { t, typed, cursor } of typewriterRows) {
  test(`D1: typewriter at ${t} ms has ${typed} characters`, async () => {
    const frame = await browser.seek(server.origin, '/embed/typewriter-5.svg', t);
    for (const { line, cell, index } of probedCells()) {
      const count = ink(frame, cellBox(line, cell));
      if (index < typed) assert.ok(count > 0, `cell ${line}/${cell} should have ink`);
      else assert.equal(count, 0, `cell ${line}/${cell} should be empty`);
    }
    if (cursor) {
      assert.ok(ink(frame, cursorBox(cursor[0], cursor[1])) > 0, 'cursor should be on');
    } else {
      assert.equal(ink(frame, cursorBox(1, 16)), 0, 'cursor should be off');
    }
    assert.ok(near(pixel(frame, 33.82, 10), CORAL), 'the cube stays visible');
  });
}

const blinkRows = [
  { t: 200, closed: false, cursor: true },
  { t: 700, closed: false, cursor: false },
  { t: 1200, closed: false, cursor: true },
  { t: 5800, closed: true, cursor: false },
  { t: 5900, closed: false, cursor: false },
  { t: 6200, closed: false, cursor: true },
];

for (const { t, closed, cursor } of blinkRows) {
  test(`D2: blink at ${t} ms has the eye ${closed ? 'closed' : 'open'}`, async () => {
    const frame = await browser.seek(server.origin, '/embed/blink-5.svg', t);
    assert.ok(near(pixel(frame, 33.82, 27.36), DARK), 'the eye centre shows the ground');
    assert.ok(near(pixel(frame, 33.82, 20), closed ? CORAL : DARK), 'upper eye');
    assert.equal(ink(frame, cursorBox(1, 16)) > 0, cursor, 'cursor');
    for (const { line, cell } of probedCells()) {
      assert.ok(ink(frame, cellBox(line, cell)) > 0, `cell ${line}/${cell} should have ink`);
    }
  });
}

test('D5: the transparent typewriter leaves the page visible', async () => {
  const frame = await browser.seek(server.origin, '/embed/typewriter-5-transparent.svg', 350);
  assert.deepEqual(frame.at(2, 2), WHITE);
  const box = toPixels(cellBox(0, 5));
  const everyPixel = frame.count(box, WHITE, 255);
  assert.equal(frame.count(box, WHITE, 0), everyPixel, 'an untyped cell is pure page color');
});

test('D5: the closed eye of the transparent blink shows the page through its slit', async () => {
  const frame = await browser.seek(server.origin, '/embed/blink-5-transparent.svg', 5800);
  assert.ok(near(pixel(frame, 33.82, 27.36), WHITE, 10), 'the slit shows the page');
  assert.ok(near(pixel(frame, 33.82, 20), CORAL), 'the lid is coral');
});

test('D6: under reduced motion no animated file has a running animation', async () => {
  const files = readdirSync(join(ROOT, 'embed')).filter(
    (name) => name.endsWith('.svg') && !/-still\.svg$|^strip-/.test(name),
  );
  assert.equal(files.length, 21);
  await browser.reducedMotion(true);
  try {
    for (const name of files) {
      await browser.seek(server.origin, `/embed/${name}`);
      assert.equal(await browser.evaluate('document.getAnimations().length'), 0, name);
    }
  } finally {
    await browser.reducedMotion(false);
  }
});

test('D6: under reduced motion the embeds rest on their full frame', async () => {
  await browser.reducedMotion(true);
  try {
    let frame = await browser.seek(server.origin, '/embed/typewriter-5.svg');
    for (const { line, cell } of probedCells()) {
      assert.ok(ink(frame, cellBox(line, cell)) > 0, `cell ${line}/${cell} should have ink`);
    }
    assert.ok(ink(frame, cursorBox(1, 16)) > 0, 'the cursor rests at the end');
    frame = await browser.seek(server.origin, '/embed/blink-5.svg');
    assert.ok(near(pixel(frame, 33.82, 27.36), DARK), 'the eye rests open');
    assert.ok(near(pixel(frame, 33.82, 20), DARK), 'the eye rests open');
    assert.ok(ink(frame, cursorBox(1, 16)) > 0, 'the cursor rests on');
  } finally {
    await browser.reducedMotion(false);
  }
});

/**
 * Open a file in an img tag and wait until it has loaded.
 *
 * @param {string} path - URL path of the SVG file.
 * @returns {Promise<void>}
 */
async function openInImg(path) {
  await browser.goto(`${server.origin}/__img.html`);
  await browser.evaluate(`document.getElementById('i').src = ${JSON.stringify(path)}; null`);
  await browser.waitFor(`document.getElementById('i').complete`);
}

test('D7: the typewriter runs inside an img tag', async () => {
  await openInImg('/embed/typewriter-5.svg');
  const first = await browser.screenshot();
  await sleep(1500);
  const second = await browser.screenshot();
  assert.notDeepEqual(first.data, second.data);
});

test('D7: the blink runs inside an img tag', async () => {
  await openInImg('/embed/blink-5.svg');
  const first = await browser.screenshot();
  let changed = false;
  for (let sample = 0; sample < 60 && !changed; sample += 1) {
    await sleep(100);
    changed = !first.data.equals((await browser.screenshot()).data);
  }
  assert.ok(changed, 'at least two samples differ');
});
