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

import { renderBanner } from '../src/banner.js';
import { renderConveyor, renderStrip, STRIP_VIEWBOX } from '../src/conveyor.js';
import { parseLockup } from '../src/lockup.js';
import { parseTile, tileDefs, tileRow } from '../src/pattern.js';

const LOCKUP = parseLockup(readFileSync('assets/logo/CDC_LogoText_5.svg', 'utf8'));
const TILES = ['Pattern4', 'Pattern5', 'Pattern6'].map((name) =>
  parseTile(readFileSync(`assets/pattern/SVG/${name}.svg`, 'utf8')),
);

test('parseTile keeps the drawing and drops metadata, ids and end tags', () => {
  const svg =
    '<svg><metadata>m</metadata><g id="Content" stroke="red"><g id="a"><line x1="1"></line></g></g>\n</svg>';
  assert.equal(parseTile(svg), '<g stroke="red"><g><line x1="1"/></g></g>');
});

test('parseTile rejects a file without a content group', () => {
  assert.throws(() => parseTile('<svg></svg>'), /no content group/);
});

test('tileDefs gives every tile an id', () => {
  assert.equal(
    tileDefs(['<g a="1"/>', '<g b="2"/>']),
    '<defs><g id="p0" a="1"/><g id="p1" b="2"/></defs>',
  );
});

test('tileRow repeats the tiles in order and bridges inner seams only', () => {
  const row = tileRow(3, 4);
  assert.deepEqual(row.match(/href="#p\d" x="\d+"/g), [
    'href="#p0" x="0"',
    'href="#p1" x="380"',
    'href="#p2" x="760"',
    'href="#p0" x="1140"',
  ]);
  assert.deepEqual(row.match(/M\d+,12h2/g), ['M379,12h2', 'M759,12h2', 'M1139,12h2']);
});

test('the master tiles carry no ids or metadata into the output', () => {
  for (const tile of TILES) {
    assert.doesNotMatch(tile, /\sid=|c2pa/);
  }
});

test('the conveyor rolls 1140 units in 570 steps over 60 seconds', () => {
  const svg = renderConveyor(TILES, { color: 'A', transparent: false });
  assert.match(svg, /\.b\{animation:b 60s steps\(570,end\) infinite\}/);
  assert.match(svg, /@keyframes b\{to\{transform:translateX\(-1140px\)\}\}/);
  assert.match(svg, /prefers-reduced-motion/);
  assert.equal(svg.match(/<use /g)?.length, 6);
  assert.ok(svg.includes(`viewBox="${STRIP_VIEWBOX}"`));
});

test('the conveyor has a ground unless transparent', () => {
  assert.match(renderConveyor(TILES, { color: 'A', transparent: false }), /fill="#001300"/);
  assert.doesNotMatch(renderConveyor(TILES, { color: 'A', transparent: true }), /#001300/);
  assert.doesNotMatch(renderConveyor(TILES, { color: 'B', transparent: true }), /#ebedf0/);
});

test('the still strip has three tiles and no animation', () => {
  const svg = renderStrip(TILES, { color: '0' });
  assert.match(svg, /color="#75b44b"/);
  assert.equal(svg.match(/<use /g)?.length, 3);
  assert.doesNotMatch(svg, /@keyframes/);
});

test('the banner frames the lockup and draws neutral patterns on a dark ground', () => {
  const svg = renderBanner(LOCKUP, TILES, { color: '5', still: false });
  assert.match(svg, /viewBox="0 0 680 331" color="#ea6f82"/);
  assert.match(
    svg,
    /<rect x="1" y="1" width="678" height="329" fill="none" stroke="currentColor" stroke-width="2"\/>/,
  );
  assert.match(svg, /translate\(115\.39 42\) scale\(1\.69645\)/);
  assert.match(
    svg,
    /<svg x="2" y="224" width="676" height="105" viewBox="0 0 676 105" color="#ebedf0">/,
  );
  assert.match(svg, /steps\(570,end\)/);
  assert.equal(svg.match(/<use /g)?.length, 6);
});

test('the dark banner draws dark patterns on the neutral ground', () => {
  const svg = renderBanner(LOCKUP, TILES, { color: 'B', still: false });
  assert.match(svg, /viewBox="0 0 676 105" color="#001300"/);
  assert.match(svg, /height="331" fill="#ebedf0"/);
});

test('the banner still has no animation and a stationary strip', () => {
  const svg = renderBanner(LOCKUP, TILES, { color: 'A', still: true });
  assert.doesNotMatch(svg, /@keyframes|class="b"/);
  assert.equal(svg.match(/<use /g)?.length, 3);
});
