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
import { test } from 'node:test';

import {
  ANIMATIONS,
  DARK,
  groundOf,
  NEUTRAL,
  PALETTE,
  TYPEWRITER_LINES,
  typewriterCycleMs,
} from '../src/config.js';

test('groundOf pairs index B with the neutral ground', () => {
  assert.equal(groundOf('B'), NEUTRAL);
});

test('groundOf pairs every other index with the dark ground', () => {
  for (const color of ['5', 'A']) {
    assert.equal(groundOf(color), DARK);
  }
});

test('every animation color exists in the palette', () => {
  for (const { colors } of Object.values(ANIMATIONS)) {
    for (const color of colors) {
      assert.ok(PALETTE[color], `missing palette entry ${color}`);
    }
  }
});

test('green is off brand: no palette entry and no animation color (SPEC D8)', () => {
  assert.equal(Object.hasOwn(PALETTE, '0'), false);
  for (const { colors } of Object.values(ANIMATIONS)) {
    assert.equal(colors.includes('0'), false);
  }
});

test('the conveyor defaults to neutral and the lockup animations to coral (SPEC D8)', () => {
  assert.equal(ANIMATIONS.conveyor.colors[0], 'A');
  assert.equal(ANIMATIONS.typewriter.colors[0], '5');
  assert.equal(ANIMATIONS.blink.colors[0], '5');
  assert.equal(ANIMATIONS.banner.colors[0], '5');
});

test('the wordmark has 14 and 16 cells', () => {
  assert.deepEqual(
    TYPEWRITER_LINES.map((line) => line.length),
    [14, 16],
  );
});

test('the typewriter loops every 9310 ms (SPEC D5)', () => {
  assert.equal(typewriterCycleMs(), 9310);
});
