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

import { cursorElement, cursorPosition, parseLockup, splitCells } from '../src/lockup.js';

const MASTER = readFileSync('assets/logo/CDC_LogoText_5.svg', 'utf8');

test('splitCells groups subpaths by the cell of their first point', () => {
  assert.deepEqual(splitCells('M80,1ZM85,1ZM92,1Z', 2), ['M80,1ZM85,1Z', 'M92,1Z']);
});

test('splitCells rejects a subpath left of the first cell', () => {
  assert.throws(() => splitCells('M10,1Z', 1), /outside the wordmark/);
});

test('splitCells rejects a subpath right of the last cell', () => {
  assert.throws(() => splitCells('M80,1ZM92,1Z', 1), /outside the wordmark/);
});

test('splitCells rejects an empty cell', () => {
  assert.throws(() => splitCells('M80,1Z', 2), /empty character cell at index 1/);
});

test('parseLockup finds five cube paths and every character of the master', () => {
  const { cube, lines } = parseLockup(MASTER);
  assert.equal(cube.length, 5);
  assert.equal(lines[0].length, 14);
  assert.equal(lines[1].length, 16);
});

test('parseLockup rejects another file', () => {
  assert.throws(() => parseLockup('<svg></svg>'), /expected 7 paths/);
});

test('cursorPosition follows the design geometry', () => {
  assert.deepEqual(cursorPosition(0, 0), { x: 78.9 + 0.74, y: 48.89 });
  const { x, y } = cursorPosition(1, 16);
  assert.ok(Math.abs(x - (78.9 + 11.73 * 16 + 0.74)) < 1e-9);
  assert.equal(y, 72.11);
});

test('cursorElement sits behind the last character', () => {
  assert.equal(
    cursorElement('k'),
    '<rect class="k" x="267.32" y="72.11" width="9.37" height="1.77" fill="currentColor"/>',
  );
});
