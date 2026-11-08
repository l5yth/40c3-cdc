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
import { afterEach, beforeEach, mock, test } from 'node:test';

/** @type {Array<[string, (event: any) => Promise<void>|undefined]>} */
const listeners = [];
/** @type {string[]} */
const copied = [];
let clipboardWorks = true;

Object.assign(globalThis, {
  document: {
    /**
     * @param {string} type - Event name.
     * @param {(event: any) => Promise<void>|undefined} listener - The listener.
     * @returns {void}
     */
    addEventListener(type, listener) {
      listeners.push([type, listener]);
    },
  },
});
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: {
    clipboard: {
      /**
       * @param {string} text - The copied text.
       * @returns {Promise<void>} Rejects when the clipboard is switched off.
       */
      async writeText(text) {
        if (!clipboardWorks) throw new Error('denied');
        copied.push(text);
      },
    },
  },
});
await import('../src/site/copy.js');
const [[eventType, onClick]] = listeners;

/**
 * Build a stand-in for a copy button.
 *
 * @returns {{dataset: Record<string, string>, textContent: string}} The button.
 */
function button() {
  return { dataset: { copy: '<img>' }, textContent: 'Copy embed' };
}

/**
 * Build a click on an element inside a button.
 *
 * @param {object|null} target - The button the click lands in.
 * @returns {{target: {closest: (selector: string) => object|null}}} The event.
 */
function clickOn(target) {
  return { target: { closest: (selector) => (selector === '[data-copy]' ? target : null) } };
}

beforeEach(() => {
  clipboardWorks = true;
  copied.length = 0;
  mock.timers.enable({ apis: ['setTimeout'] });
});

afterEach(() => {
  mock.timers.reset();
});

test('the script listens for clicks on the whole page', () => {
  assert.equal(eventType, 'click');
});

test('a click copies the snippet and confirms it for a moment', async () => {
  const target = button();
  await onClick(clickOn(target));
  assert.deepEqual(copied, ['<img>']);
  assert.equal(target.textContent, 'Copied');
  mock.timers.tick(1200);
  assert.equal(target.textContent, 'Copy embed');
});

test('a second click during the confirmation keeps the original label', async () => {
  const target = button();
  await onClick(clickOn(target));
  await onClick(clickOn(target));
  mock.timers.tick(1200);
  assert.equal(target.textContent, 'Copy embed');
});

test('a refused clipboard shows on the button', async () => {
  clipboardWorks = false;
  const target = button();
  await onClick(clickOn(target));
  assert.equal(target.textContent, 'Copy failed');
  mock.timers.tick(1200);
  assert.equal(target.textContent, 'Copy embed');
});

test('a click elsewhere does nothing', () => {
  assert.equal(onClick(clickOn(null)), undefined);
  assert.deepEqual(copied, []);
});
