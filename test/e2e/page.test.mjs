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

// Layer F of ACCEPTANCE.md: the embed page. Needs a finished build.

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { launch, serve } from './lib.mjs';

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '_site');
const BASE = 'https://l5yth.github.io/40c3-cdc/';

/** @type {Awaited<ReturnType<typeof launch>>} */
let browser;
/** @type {Awaited<ReturnType<typeof serve>>} */
let server;

before(async () => {
  server = await serve(SITE);
  browser = await launch();
  await browser.viewport(1280, 900);
  await browser.goto(`${server.origin}/`);
});

after(async () => {
  browser.close();
  await server.close();
});

/**
 * Read a list of attribute values from the page.
 *
 * @param {string} selector - CSS selector.
 * @param {string} attribute - Attribute name.
 * @returns {Promise<string[]>} The values.
 */
function attributes(selector, attribute) {
  return browser.evaluate(
    `[...document.querySelectorAll(${JSON.stringify(selector)})].map((e) => e.getAttribute(${JSON.stringify(attribute)}))`,
  );
}

test('F1: the page lists every item', async () => {
  const items = await attributes('[data-item]', 'data-item');
  assert.equal(items.length, 65);
  const play = await attributes('[data-item]:has([data-play])', 'data-item');
  assert.equal(play.length, 23, 'animation files');
  const sections = await browser.evaluate(
    `[...document.querySelectorAll('[data-section]')].map((s) => [s.dataset.section, s.querySelectorAll('[data-item]').length])`,
  );
  assert.deepEqual(sections, [
    ['animations', 23],
    ['stills', 7],
    ['logo', 9],
    ['pattern', 16],
    ['matrix', 10],
  ]);
});

test('F2: every snippet is an img tag whose file exists', async () => {
  const snippets = await attributes('[data-copy]', 'data-copy');
  assert.ok(snippets.length > 0);
  for (const snippet of snippets) {
    assert.ok(snippet.startsWith(`<img src="${BASE}`), snippet);
    assert.ok(snippet.includes('alt="'), snippet);
    const url = snippet.slice('<img src="'.length, snippet.indexOf('" alt='));
    assert.ok(existsSync(join(SITE, decodeURI(url.slice(BASE.length)))), url);
  }
});

test('F2: the copy button puts the snippet on the real clipboard', async () => {
  await browser.send('Browser.grantPermissions', {
    origin: server.origin,
    permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
  });
  await browser.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await browser.goto(`${server.origin}/`);
  const result = await browser.evaluate(`(async () => {
    const button = document.querySelector('[data-copy]');
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 150));
    return {
      label: button.textContent,
      copied: await navigator.clipboard.readText(),
      expected: button.dataset.copy,
    };
  })()`);
  assert.equal(result.label, 'Copied');
  assert.equal(result.copied, result.expected);
});

test('F3: every animation has a fullscreen link', async () => {
  const links = await attributes('[data-play]', 'href');
  assert.equal(links.length, 23);
  for (const link of links) {
    assert.match(link, /^https:\/\/l5yth\.github\.io\/40c3-cdc\/play\/\?a=[a-z]+&c=[05AB]$/);
  }
});

test('F4: every download link answers', async () => {
  const links = await attributes('[data-download]', 'href');
  assert.ok(links.length >= 65);
  for (const link of links) {
    const response = await fetch(`${server.origin}/${link}`);
    assert.equal(response.status, 200, link);
    await response.arrayBuffer();
  }
});

test('F5: the page has the 40C3 look', async () => {
  const look = await browser.evaluate(`(() => {
    const style = (e) => getComputedStyle(e);
    const items = [...document.querySelectorAll('[data-item]')];
    return {
      background: style(document.body).backgroundColor,
      body: style(document.body).fontFamily,
      h1: style(document.querySelector('h1')).fontFamily,
      h2: style(document.querySelector('h2')).fontFamily,
      radius: [...new Set(items.map((e) => style(e).borderRadius))],
      shadow: [...new Set(items.map((e) => style(e).boxShadow))],
    };
  })()`);
  assert.equal(look.background, 'rgb(0, 19, 0)');
  assert.match(look.body, /^Hack/);
  assert.match(look.h1, /^"Jersey 10"/);
  assert.match(look.h2, /^"Jersey 10"/);
  assert.deepEqual(look.radius, ['0px']);
  assert.deepEqual(look.shadow, ['none']);
});

test('F6: page and player only talk to the local server', async () => {
  browser.requests.length = 0;
  await browser.goto(`${server.origin}/`);
  await browser.evaluate(`document.fonts.ready.then(() => null)`);
  await browser.goto(`${server.origin}/play/?a=banner&c=5`);
  assert.ok(browser.requests.length > 0);
  for (const url of browser.requests) {
    assert.ok(url.startsWith(server.origin), url);
  }
  await browser.goto(`${server.origin}/`);
  const scripts = await browser.evaluate('[...document.scripts].map((s) => s.getAttribute("src"))');
  assert.deepEqual(scripts, ['copy.js']);
});

test('F5: the page has no horizontal scroll at phone width', async () => {
  await browser.viewport(360, 800);
  await browser.goto(`${server.origin}/`);
  const widths = await browser.evaluate(
    '[document.documentElement.scrollWidth, document.documentElement.clientWidth]',
  );
  await browser.viewport(1280, 900);
  assert.equal(widths[0], widths[1]);
});
