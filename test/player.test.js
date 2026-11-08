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

import { playerConfig, renderPlayerPage } from '../src/site.js';

const CONFIG = playerConfig();

/**
 * Build a stand-in for the player page's document.
 *
 * @returns {any} The document.
 */
function stubPage() {
  return {
    body: {
      dataset: { config: JSON.stringify(CONFIG) },
      style: { background: '' },
    },
    elements: /** @type {Record<string, any>} */ ({
      lockup: { src: '', hidden: true },
      strip: { style: { backgroundImage: '' }, hidden: true },
    }),
    /**
     * @param {string} id - Element id.
     * @returns {any} The element.
     */
    getElementById(id) {
      return this.elements[id];
    },
  };
}

const page = stubPage();
Object.assign(globalThis, { document: page, location: { search: '?a=typewriter&c=B' } });
await import('../src/site/player.js');
const { resolvePlayer, playerSources, mountPlayer } = /** @type {any} */ (globalThis).cdcPlayer;

test('the player sets up the page from the URL when it loads', () => {
  assert.equal(page.body.dataset.animation, 'typewriter');
  assert.equal(page.body.dataset.color, 'B');
  assert.equal(page.body.style.background, '#ebedf0');
  assert.deepEqual(page.elements.lockup, {
    src: '../embed/typewriter-B-transparent.svg',
    hidden: false,
  });
  assert.equal(page.elements.strip.hidden, true);
});

test('the banner fills the lockup slot and the repeating strip', () => {
  const banner = stubPage();
  mountPlayer(banner, '?a=banner&c=5');
  assert.equal(banner.elements.lockup.src, '../assets/logo/CDC_LogoText_5.svg');
  assert.equal(banner.elements.lockup.hidden, false);
  assert.equal(
    banner.elements.strip.style.backgroundImage,
    'url("../embed/conveyor-A-transparent.svg")',
  );
  assert.equal(banner.elements.strip.hidden, false);
});

for (const [search, animation, color] of [
  ['', 'banner', '5'],
  ['?a=conveyor', 'conveyor', 'A'],
  ['?a=typewriter&c=B', 'typewriter', 'B'],
  ['?a=nope&c=0', 'banner', '5'],
  ['?a=blink&c=0', 'blink', '5'],
  ['?a=conveyor&c=0', 'conveyor', '0'],
  ['?a=constructor', 'banner', '5'],
]) {
  test(`resolvePlayer("${search}") is ${animation} in color ${color}`, () => {
    assert.deepEqual(resolvePlayer(search, CONFIG), { animation, color });
  });
}

test('the banner scene combines the static lockup with a transparent belt', () => {
  assert.deepEqual(playerSources('banner', '5'), {
    lockup: '../assets/logo/CDC_LogoText_5.svg',
    strip: '../embed/conveyor-A-transparent.svg',
  });
});

test('the banner scene draws a dark belt on the neutral ground', () => {
  assert.equal(playerSources('banner', 'B').strip, '../embed/conveyor-B-transparent.svg');
});

test('the conveyor only uses the strip slot', () => {
  assert.deepEqual(playerSources('conveyor', '0'), {
    lockup: undefined,
    strip: '../embed/conveyor-0-transparent.svg',
  });
});

test('typewriter and blink only use the lockup slot', () => {
  assert.deepEqual(playerSources('blink', 'A'), {
    lockup: '../embed/blink-A-transparent.svg',
    strip: undefined,
  });
});

test('the player config lists colors and grounds', () => {
  assert.deepEqual(CONFIG.animations.conveyor, ['A', '5', '0', 'B']);
  assert.equal(CONFIG.grounds.B, '#ebedf0');
  assert.equal(CONFIG.grounds['5'], '#001300');
});

test('the player page carries its configuration and both image slots', () => {
  const html = renderPlayerPage();
  assert.ok(html.includes(`data-config='${JSON.stringify(CONFIG)}'`));
  assert.match(html, /<img id="lockup"[^>]* hidden>/);
  assert.match(html, /<div id="strip" hidden><\/div>/);
  assert.match(html, /<script src="player\.js"><\/script>/);
});
