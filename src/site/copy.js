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

/**
 * The page's copy buttons. Runs as a classic script.
 *
 * @module copy
 */

/**
 * How long a button shows the result of a copy, in milliseconds.
 *
 * @type {number}
 */
const FEEDBACK_MS = 1200;

/**
 * Show a message on a button for a moment.
 *
 * @param {HTMLElement} button - The button.
 * @param {string} message - The message.
 * @returns {void}
 */
function flashLabel(button, message) {
  const label = button.dataset.label ?? String(button.textContent);
  button.dataset.label = label;
  button.textContent = message;
  setTimeout(() => {
    button.textContent = label;
  }, FEEDBACK_MS);
}

/**
 * Copy a button's snippet to the clipboard. Pages opened from disk have no
 * clipboard access, which the button then reports.
 *
 * @param {HTMLElement} button - The button.
 * @returns {Promise<void>} Resolves when the button shows the result.
 */
async function copySnippet(button) {
  try {
    await navigator.clipboard.writeText(String(button.dataset.copy));
    flashLabel(button, 'Copied');
  } catch {
    flashLabel(button, 'Copy failed');
  }
}

/**
 * React to a click anywhere on the page.
 *
 * @param {Event} event - The click.
 * @returns {Promise<void>|undefined} The copy in progress, if any.
 */
function handleClick(event) {
  const target = /** @type {Element} */ (event.target);
  const button = /** @type {HTMLElement|null} */ (target.closest('[data-copy]'));
  return button ? copySnippet(button) : undefined;
}

document.addEventListener('click', handleClick);
