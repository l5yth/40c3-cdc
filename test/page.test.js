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

import { escapeHtml, renderPage } from '../src/page.js';

const IMAGE = {
  stem: 'a',
  title: 'a <b>',
  preview: 'x/a b.svg',
  ground: 'light',
  snippet: '<img src="u" alt="a">',
  play: 'https://x/play/?a=b&c=5',
  downloads: [{ label: 'SVG', href: 'x/a b.svg' }],
};
const FILE = {
  stem: 'notes',
  title: 'notes',
  preview: null,
  ground: 'dark',
  snippet: null,
  play: null,
  downloads: [{ label: 'PDF', href: 'x/notes.pdf' }],
};
const PAGE = renderPage([{ id: 'things', title: 'Things', items: [IMAGE, FILE] }]);

test('escapeHtml covers text and attribute values', () => {
  assert.equal(escapeHtml(`<a href="x">&`), '&lt;a href=&quot;x&quot;&gt;&amp;');
});

test('a section carries its id and heading', () => {
  assert.match(PAGE, /<section data-section="things">\n<h2>Things<\/h2>/);
});

test('an image item has preview, escaped snippet, player link and download', () => {
  assert.match(PAGE, /data-item="a"/);
  assert.match(PAGE, /data-ground="light"><img src="x\/a%20b\.svg" alt="" loading="lazy">/);
  assert.match(PAGE, /<h3>a &lt;b&gt;<\/h3>/);
  assert.ok(PAGE.includes('data-copy="&lt;img src=&quot;u&quot; alt=&quot;a&quot;&gt;"'));
  assert.ok(PAGE.includes('<a data-play href="https://x/play/?a=b&amp;c=5">'));
  assert.ok(PAGE.includes('<a data-download href="x/a%20b.svg" download>SVG</a>'));
});

test('another file only gets a download link', () => {
  const item = PAGE.slice(PAGE.indexOf('data-item="notes"'));
  assert.doesNotMatch(
    item.slice(0, item.indexOf('</article>')),
    /class="preview"|data-copy|data-play/,
  );
  assert.match(item, /<a data-download href="x\/notes\.pdf" download>PDF<\/a>/);
});

test('the page loads one script and no remote resources', () => {
  assert.equal(PAGE.match(/<script/g)?.length, 1);
  assert.match(PAGE, /<script src="copy\.js"><\/script>/);
  assert.doesNotMatch(PAGE, /(src|rel="stylesheet" href)="https?:/);
});
