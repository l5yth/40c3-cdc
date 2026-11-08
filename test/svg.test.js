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
  extractPaths,
  fmt,
  groundRect,
  parseAttrs,
  pathElement,
  percent,
  REDUCED_MOTION,
  splitSubpaths,
  svgDocument,
} from '../src/svg.js';

test('fmt drops float noise and trailing zeros', () => {
  assert.equal(fmt(0.1 + 0.2), '0.3');
  assert.equal(fmt(10), '10');
  assert.equal(fmt(-1.23456), '-1.235');
});

test('percent writes a keyframe selector', () => {
  assert.equal(percent(700, 9310), '7.5188%');
  assert.equal(percent(0, 9310), '0%');
});

test('parseAttrs reads names with dashes and colons', () => {
  assert.deepEqual(parseAttrs(' fill-rule="evenodd" xlink:href="#a"'), {
    'fill-rule': 'evenodd',
    'xlink:href': '#a',
  });
});

test('extractPaths reads both tag forms and skips metadata', () => {
  const svg = '<svg><metadata>x</metadata><path d="M1" /><path fill="red" d="M2"></path></svg>';
  assert.deepEqual(extractPaths(svg), [{ d: 'M1' }, { fill: 'red', d: 'M2' }]);
});

test('splitSubpaths cuts before every move command', () => {
  assert.deepEqual(splitSubpaths('M1,1L2,2ZM3,3L4,4Z'), ['M1,1L2,2Z', 'M3,3L4,4Z']);
  assert.deepEqual(splitSubpaths(' '), []);
});

test('pathElement keeps class, transform and fill rule', () => {
  assert.equal(pathElement({ d: 'M1' }), '<path fill="currentColor" d="M1"/>');
  assert.equal(
    pathElement({ d: 'M1', transform: 'scale(2)', 'fill-rule': 'evenodd' }, 'x'),
    '<path fill="currentColor" class="x" transform="scale(2)" fill-rule="evenodd" d="M1"/>',
  );
});

test('svgDocument writes header, root attributes, style and body', () => {
  const text = svgDocument({
    viewBox: '0 0 1 1',
    color: '#123456',
    label: 'L',
    style: 'a{}',
    body: '<g/>',
  });
  assert.match(
    text,
    /^<!-- SPDX-FileCopyrightText: 2026 l5yth -->\n<!-- SPDX-License-Identifier: CC0-1.0 -->\n<svg /,
  );
  assert.match(text, /viewBox="0 0 1 1" color="#123456" role="img" aria-label="L">/);
  assert.match(text, /<style>a\{\}<\/style>\n<g\/>\n<\/svg>\n$/);
});

test('groundRect fills the viewBox', () => {
  assert.equal(
    groundRect('-1 -2 3 4', '#000'),
    '<rect x="-1" y="-2" width="3" height="4" fill="#000"/>',
  );
});

test('REDUCED_MOTION stops every animation', () => {
  assert.match(REDUCED_MOTION, /prefers-reduced-motion:reduce/);
  assert.match(REDUCED_MOTION, /animation:none!important/);
});
