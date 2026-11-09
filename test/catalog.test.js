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
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  animationItem,
  animationSection,
  buildCatalog,
  fileItem,
  folderSections,
  groupItems,
  imageSnippet,
  listFolder,
  previewGround,
  stillSection,
} from '../src/catalog.js';

/**
 * Create a tree of empty files.
 *
 * @param {string[]} paths - Paths below the new root.
 * @returns {string} The root.
 */
function tree(paths) {
  const root = mkdtempSync(join(tmpdir(), 'cdc-catalog-'));
  for (const path of paths) {
    mkdirSync(join(root, path, '..'), { recursive: true });
    writeFileSync(join(root, path), '');
  }
  return root;
}

test('files with dark ink preview on the light ground', () => {
  for (const stem of ['CDC_Logo_B', 'typewriter-B-transparent', 'Pattern4_dark-on-transparent']) {
    assert.equal(previewGround(stem), 'light', stem);
  }
});

test('other files preview on the dark ground', () => {
  for (const stem of ['CDC_Logo_5', 'conveyor-A', 'BANNER', 'CDC_Space_logo_neutral']) {
    assert.equal(previewGround(stem), 'dark', stem);
  }
});

test('imageSnippet writes an absolute, encoded URL', () => {
  assert.equal(
    imageSnippet('designs/my shirts/a.svg', 'A'),
    '<img src="https://l5yth.github.io/40c3-cdc/designs/my%20shirts/a.svg" alt="A">',
  );
});

test('listFolder recurses, sorts and leaves out README files', () => {
  const root = tree(['x/README.md', 'x/b/two.png', 'x/one.svg', 'x/b/readme.txt']);
  assert.deepEqual(listFolder(root, 'x'), ['x/b/two.png', 'x/one.svg']);
});

test('fileItem prefers the SVG and offers every format', () => {
  const item = fileItem('CDC_Logo_5', ['a/CDC_Logo_5.png', 'a/CDC_Logo_5.svg']);
  assert.equal(item.preview, 'a/CDC_Logo_5.svg');
  assert.equal(item.title, 'CDC Logo 5');
  assert.equal(item.play, null);
  assert.match(String(item.snippet), /a\/CDC_Logo_5\.svg" alt="CDC Logo 5">$/);
  assert.deepEqual(item.downloads, [
    { label: 'PNG', href: 'a/CDC_Logo_5.png' },
    { label: 'SVG', href: 'a/CDC_Logo_5.svg' },
  ]);
});

test('fileItem gives other files only a download link', () => {
  const item = fileItem('print-notes', ['a/print-notes.pdf']);
  assert.equal(item.preview, null);
  assert.equal(item.snippet, null);
  assert.deepEqual(item.downloads, [{ label: 'PDF', href: 'a/print-notes.pdf' }]);
});

test('groupItems makes one item per stem, sorted', () => {
  const items = groupItems(['d/b.svg', 'd/a.png', 'e/b.png']);
  assert.deepEqual(
    items.map(({ stem, downloads }) => [stem, downloads.length]),
    [
      ['a', 1],
      ['b', 2],
    ],
  );
});

test('groupItems sorts by the given groups first, then by stem', () => {
  const paths = ['d/b_dark.svg', 'd/a_dark.svg', 'd/c_light.svg'];
  assert.deepEqual(
    groupItems(paths, [/_light$/, /_dark$/]).map(({ stem }) => stem),
    ['c_light', 'a_dark', 'b_dark'],
  );
});

test('groupItems puts a stem outside every group last', () => {
  assert.deepEqual(
    groupItems(['d/a_other.svg', 'd/z_first.svg'], [/_first$/]).map(({ stem }) => stem),
    ['z_first', 'a_other'],
  );
});

test('animationItem links the player and describes the image', () => {
  const lockup = animationItem('blink', 'A', true);
  assert.equal(lockup.stem, 'blink-A-transparent');
  assert.equal(lockup.play, 'https://l5yth.github.io/40c3-cdc/play/?a=blink&c=A');
  assert.match(String(lockup.snippet), /alt="40C3 Critical Decentralisation"/);
  const belt = animationItem('conveyor', 'A', false);
  assert.match(String(belt.snippet), /alt="Line art of radios/);
});

test('the sections list 21 animations and 6 stills', () => {
  assert.equal(animationSection().items.length, 21);
  const stills = stillSection();
  assert.equal(stills.items.length, 6);
  assert.deepEqual(stills.items[0].downloads, [
    { label: 'SVG', href: 'embed/banner-5-still.svg' },
    { label: 'PNG', href: 'embed/banner-5-still.png' },
  ]);
});

test('folderSections puts known folders first and titles the rest by name', () => {
  const root = tree(['p/zeta/a.svg', 'p/known/b.svg', 'p/alpha/c.svg', 'p/README.md']);
  const sections = folderSections(root, 'p', { known: 'Known things' });
  assert.deepEqual(
    sections.map(({ id, title }) => [id, title]),
    [
      ['known', 'Known things'],
      ['alpha', 'alpha'],
      ['zeta', 'zeta'],
    ],
  );
});

test('folderSections applies the item order of one folder only', () => {
  const root = tree(['p/x/a_2.svg', 'p/x/b_1.svg', 'p/y/a_2.svg', 'p/y/b_1.svg']);
  const sections = folderSections(root, 'p', {}, { x: [/_1$/, /_2$/] });
  assert.deepEqual(
    sections.map(({ id, items }) => [id, items.map(({ stem }) => stem)]),
    [
      ['x', ['b_1', 'a_2']],
      ['y', ['a_2', 'b_1']],
    ],
  );
});

test('the catalog of this repository has all sections and 58 items', () => {
  const sections = buildCatalog('.');
  assert.deepEqual(
    sections.map(({ id, items }) => [id, items.length]),
    [
      ['animations', 21],
      ['stills', 6],
      ['logo', 9],
      ['pattern', 12],
      ['matrix', 10],
    ],
  );
});

test('the patterns go masters, neutral, dark, tiled previews (SPEC D10)', () => {
  const pattern = buildCatalog('.').find(({ id }) => id === 'pattern');
  assert.deepEqual(
    pattern?.items.map(({ stem }) => stem),
    [
      'Pattern4',
      'Pattern5',
      'Pattern6',
      'Pattern4_neutral-on-transparent',
      'Pattern5_neutral-on-transparent',
      'Pattern6_neutral-on-transparent',
      'Pattern4_dark-on-transparent',
      'Pattern5_dark-on-transparent',
      'Pattern6_dark-on-transparent',
      'Pattern4_tiled-preview',
      'Pattern5_tiled-preview',
      'Pattern6_tiled-preview',
    ],
  );
});
