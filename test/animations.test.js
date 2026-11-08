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
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { eyelidPath, renderBlink } from '../src/blink.js';
import { parseLockup } from '../src/lockup.js';
import { cursorCell, renderTypewriter, typedAt } from '../src/typewriter.js';

const LOCKUP = parseLockup(readFileSync('assets/logo/CDC_LogoText_5.svg', 'utf8'));

test('characters appear from 700 ms in 90 ms steps', () => {
  assert.equal(typedAt(0), 700);
  assert.equal(typedAt(1), 790);
  assert.equal(typedAt(29), 3310);
});

test('the cursor stays on line 1 until it is complete', () => {
  assert.deepEqual(cursorCell(0), { line: 0, cell: 0 });
  assert.deepEqual(cursorCell(13), { line: 0, cell: 13 });
  assert.deepEqual(cursorCell(14), { line: 1, cell: 0 });
  assert.deepEqual(cursorCell(30), { line: 1, cell: 16 });
});

test('typewriter runs on the 9.31 s loop with one rule per character', () => {
  const svg = renderTypewriter(LOCKUP, { color: '5', transparent: false });
  assert.equal(svg.match(/@keyframes c\d+/g)?.length, 30);
  assert.match(svg, /\.c0\{animation:c0 9\.31s step-end infinite\}/);
  assert.match(svg, /@keyframes c0\{0%\{opacity:0\}7\.5188%\{opacity:1\}\}/);
  assert.match(svg, /@keyframes c29\{0%\{opacity:0\}35\.5532%\{opacity:1\}\}/);
});

test('typewriter cursor blinks through the hold and ends off', () => {
  const svg = renderTypewriter(LOCKUP, { color: '5', transparent: false });
  const frames = svg.match(/@keyframes b\{(.*?)\}\}/)?.[1] ?? '';
  assert.equal(frames.match(/opacity:0/g)?.length, 6);
  assert.equal(frames.match(/opacity:1/g)?.length, 6);
  assert.match(frames, /94\.6294%\{opacity:0$/);
});

test('typewriter cursor starts on the first cell and ends on its resting place', () => {
  const svg = renderTypewriter(LOCKUP, { color: '5', transparent: false });
  assert.match(svg, /@keyframes m\{0%\{transform:translate\(-187\.68px,-23\.22px\)\}/);
  assert.match(svg, /35\.5532%\{transform:translate\(0px,0px\)\}\}/);
});

test('typewriter has a ground unless transparent', () => {
  const grounded = renderTypewriter(LOCKUP, { color: '5', transparent: false });
  assert.match(
    grounded,
    /<rect x="-18\.86" y="-18\.86" width="302\.52" height="126\.14" fill="#001300"\/>/,
  );
  const clear = renderTypewriter(LOCKUP, { color: '5', transparent: true });
  assert.doesNotMatch(clear, /#001300/);
});

test('blink closes the eye on the design schedule and blinks the cursor', () => {
  const svg = renderBlink(LOCKUP, { color: '5', transparent: false });
  assert.match(svg, /animation:e 6s linear infinite/);
  assert.match(
    svg,
    /0%,94%\{transform:scaleY\(0\)\}94\.5%,97\.5%\{transform:scaleY\(1\)\}98%,100%/,
  );
  assert.match(svg, /\.k\{animation:k 1s step-end infinite\}/);
});

test('the eyelid is a disc with a slit cut out of it', () => {
  assert.equal(
    eyelidPath(),
    'M23.41,27.36a10.41,10.41 0 1 0 20.82,0a10.41,10.41 0 1 0 -20.82,0ZM24.25,26.475H43.39V28.245H24.25Z',
  );
  const svg = renderBlink(LOCKUP, { color: '5', transparent: true });
  assert.match(svg, /class="e" fill-rule="evenodd"/);
  assert.doesNotMatch(svg, /#001300/);
});

test('the dark variant uses dark ink on the neutral ground', () => {
  for (const render of [renderTypewriter, renderBlink]) {
    const svg = render(LOCKUP, { color: 'B', transparent: false });
    assert.match(svg, /color="#001300"/);
    assert.match(svg, /fill="#ebedf0"/);
  }
});
