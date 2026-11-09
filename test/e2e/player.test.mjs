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

// Layer E of ACCEPTANCE.md: the fullscreen player. Needs a finished build.

import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { launch, near, serve, sleep } from './lib.mjs';

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '_site');
const CORAL = [0xea, 0x6f, 0x82];
const DARK = [0x00, 0x13, 0x00];
const NEUTRAL = [0xeb, 0xed, 0xf0];
const VIEWPORTS = [
  [1920, 1080],
  [1280, 1024],
  [3840, 1080],
  [1080, 1920],
  [3840, 300],
];

/** @type {Awaited<ReturnType<typeof launch>>} */
let browser;
/** @type {Awaited<ReturnType<typeof serve>>} */
let server;

before(async () => {
  server = await serve(SITE, {
    '/__iframe.html':
      '<!doctype html><style>html,body{margin:0}</style><iframe src="/play/?a=conveyor&c=A" width="800" height="300" style="border:0"></iframe>',
  });
  browser = await launch({ reducedMotion: true });
});

after(async () => {
  browser.close();
  await server.close();
});

/**
 * Open a player URL and wait for its images.
 *
 * @param {string} query - The player's query string.
 * @returns {Promise<import('./lib.mjs').Frame>} A screenshot.
 */
async function open(query) {
  await browser.goto(`${server.origin}/play/${query}`);
  await browser.waitFor(
    '[...document.images].every((i) => i.hidden || (i.complete && i.naturalWidth > 0))',
  );
  await browser.waitFor(
    `document.getElementById('strip').hidden || performance.getEntriesByType('resource').some((e) => e.name.includes('conveyor') && e.responseEnd > 0)`,
  );
  await sleep(150);
  return browser.screenshot();
}

/**
 * Find the bounding box of the pixels that match a test.
 *
 * @param {import('./lib.mjs').Frame} frame - The screenshot.
 * @param {(pixel: number[]) => boolean} match - The test.
 * @returns {{left: number, top: number, right: number, bottom: number}} The box.
 */
function bounds(frame, match) {
  let left = frame.width;
  let top = frame.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < frame.height; y += 1) {
    for (let x = 0; x < frame.width; x += 1) {
      if (match(frame.at(x, y))) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }
  return { left, top, right, bottom };
}

/**
 * @param {number[]} pixel - A pixel.
 * @returns {boolean} True when it differs from the dark ground.
 */
const isInk = (pixel) => !near(pixel, DARK, 0);

test('E1: the rest frame holds still and shows the whole wordmark', async () => {
  await browser.viewport(1920, 1080);
  const first = await open('?a=typewriter&c=5');
  await sleep(1500);
  const second = await browser.screenshot();
  assert.deepEqual(first.data, second.data, 'no motion under the reduced-motion preference');
  const ink = bounds(first, isInk);
  assert.ok(ink.right - ink.left > 1920 * 0.8, 'the wordmark is fully typed');
});

for (const [width, height] of VIEWPORTS) {
  for (const animation of ['typewriter', 'blink']) {
    test(`E1: ${animation} is centred with margins at ${width}x${height}`, async () => {
      await browser.viewport(width, height);
      const frame = await open(`?a=${animation}&c=5`);
      for (const [x, y] of [
        [0, 0],
        [width - 1, 0],
        [0, height - 1],
        [width - 1, height - 1],
      ]) {
        assert.ok(near(frame.at(x, y), DARK, 0), `corner ${x},${y}`);
      }
      const box = await browser.evaluate(
        `(() => { const b = document.getElementById('lockup').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; })()`,
      );
      assert.ok(Math.abs(box.x - width / 2) <= width * 0.01, 'centred horizontally');
      assert.ok(Math.abs(box.y - height / 2) <= height * 0.01, 'centred vertically');
      const ink = bounds(frame, isInk);
      assert.ok(ink.left >= width * 0.02 && width - ink.right >= width * 0.02, 'side margins');
      assert.ok(ink.top >= height * 0.02 && height - ink.bottom >= height * 0.02, 'top and bottom');
    });
  }

  test(`E1: conveyor spans the width and is centred at ${width}x${height}`, async () => {
    await browser.viewport(width, height);
    const frame = await open('?a=conveyor&c=A');
    const edge = Math.floor(width * 0.05);
    const whole = { top: 0, bottom: height };
    assert.ok(frame.count({ ...whole, left: 0, right: edge }, NEUTRAL) > 0, 'left edge');
    assert.ok(frame.count({ ...whole, left: width - edge, right: width }, NEUTRAL) > 0, 'right');
    const ink = bounds(frame, isInk);
    const middle = (ink.top + ink.bottom) / 2;
    assert.ok(Math.abs(middle - height / 2) <= height * 0.02, `vertical centre ${middle}`);
  });

  test(`E1: banner fills the screen without a border at ${width}x${height}`, async () => {
    await browser.viewport(width, height);
    const frame = await open('?a=banner&c=5');
    const rim = 4;
    for (const box of [
      { left: 0, top: 0, right: width, bottom: rim },
      { left: 0, top: height - rim, right: width, bottom: height },
      { left: 0, top: 0, right: rim, bottom: height },
      { left: width - rim, top: 0, right: width, bottom: height },
    ]) {
      assert.equal(frame.count(box, CORAL), 0, 'no coral at the edge');
    }
    const coral = bounds(frame, (pixel) => near(pixel, CORAL, 12));
    const centre = (coral.left + coral.right) / 2;
    assert.ok(Math.abs(centre - width / 2) <= width * 0.01, `horizontal centre ${centre}`);
    const edge = Math.floor(width * 0.05);
    const third = Math.floor((height * 2) / 3);
    const lower = { top: third, bottom: height };
    assert.ok(frame.count({ ...lower, left: 0, right: edge }, NEUTRAL) > 0, 'left edge');
    assert.ok(frame.count({ ...lower, left: width - edge, right: width }, NEUTRAL) > 0, 'right');
    const upper = { left: 0, top: 0, right: width, bottom: third };
    assert.equal(frame.count(upper, NEUTRAL), 0, 'the strip stays in the bottom third');
  });
}

for (const [query, animation, color] of [
  ['', 'banner', '5'],
  ['?a=conveyor', 'conveyor', 'A'],
  ['?a=typewriter&c=B', 'typewriter', 'B'],
  ['?a=nope&c=0', 'banner', '5'],
  ['?a=blink&c=0', 'blink', '5'],
  ['?a=conveyor&c=0', 'conveyor', 'A'],
]) {
  test(`E2: play/${query} resolves to ${animation} ${color}`, async () => {
    await browser.viewport(800, 450);
    await open(query);
    assert.equal(await browser.evaluate('document.body.dataset.animation'), animation);
    assert.equal(await browser.evaluate('document.body.dataset.color'), color);
  });
}

test('E3: the player works inside an iframe', async () => {
  await browser.viewport(800, 300);
  browser.consoleErrors.length = 0;
  await browser.goto(`${server.origin}/__iframe.html`);
  await new Promise((resolve) => setTimeout(resolve, 800));
  const frame = await browser.screenshot();
  assert.ok(frame.count({ left: 0, top: 0, right: 800, bottom: 300 }, NEUTRAL) > 0, 'ink');
  assert.deepEqual(browser.consoleErrors, []);
});
