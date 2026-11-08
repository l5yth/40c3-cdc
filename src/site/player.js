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
 * The fullscreen player (SPEC D9). It reads `a` and `c` from the URL and shows
 * the matching files. This runs as a classic script, without imports, so the
 * player also works when opened from disk on a kiosk machine.
 *
 * @module player
 */

/**
 * @typedef {object} PlayerConfig
 * @property {Object<string, string[]>} animations - Colors per animation, the default first.
 * @property {Object<string, string>} grounds - Ground color per palette index.
 */

/**
 * Pick the animation and color from a query string. Missing or invalid values
 * fall back to the banner and to the animation's default color.
 *
 * @param {string} search - The query string.
 * @param {PlayerConfig} config - Valid names and colors.
 * @returns {{animation: string, color: string}} The resolved choice.
 */
function resolvePlayer(search, config) {
  const params = new URLSearchParams(search);
  const requested = params.get('a') ?? '';
  const animation = Object.hasOwn(config.animations, requested) ? requested : 'banner';
  const colors = config.animations[animation];
  const color = colors.includes(params.get('c') ?? '') ? String(params.get('c')) : colors[0];
  return { animation, color };
}

/**
 * Name the files that make up one player screen. They are the versions without
 * a ground, because the page itself fills the window with the ground color.
 *
 * @param {string} animation - Animation name.
 * @param {string} color - Palette index.
 * @returns {{lockup: (string|undefined), strip: (string|undefined)}} URLs of the two slots.
 */
function playerSources(animation, color) {
  if (animation === 'banner') {
    return {
      lockup: `../assets/logo/CDC_LogoText_${color}.svg`,
      strip: `../embed/conveyor-${color === 'B' ? 'B' : 'A'}-transparent.svg`,
    };
  }
  if (animation === 'conveyor') {
    return { lockup: undefined, strip: `../embed/conveyor-${color}-transparent.svg` };
  }
  return { lockup: `../embed/${animation}-${color}-transparent.svg`, strip: undefined };
}

/**
 * Show a file in the image slot, or leave the slot hidden without one.
 *
 * @param {HTMLImageElement} image - The slot.
 * @param {string|undefined} source - URL of the file.
 * @returns {void}
 */
function fillLockup(image, source) {
  if (source) {
    image.src = source;
    image.hidden = false;
  }
}

/**
 * Show a conveyor in the strip slot, or leave the slot hidden without one. The
 * strip is a repeating background, so it covers the full width of any window.
 * That works because the conveyor's picture repeats with exactly its own width.
 *
 * @param {HTMLElement} strip - The slot.
 * @param {string|undefined} source - URL of the file.
 * @returns {void}
 */
function fillStrip(strip, source) {
  if (source) {
    strip.style.backgroundImage = `url("${source}")`;
    strip.hidden = false;
  }
}

/**
 * Set up the player page.
 *
 * @param {Document} doc - The player document.
 * @param {string} search - The query string.
 * @returns {void}
 */
function mountPlayer(doc, search) {
  const config = /** @type {PlayerConfig} */ (JSON.parse(String(doc.body.dataset.config)));
  const { animation, color } = resolvePlayer(search, config);
  doc.body.dataset.animation = animation;
  doc.body.dataset.color = color;
  doc.body.style.background = config.grounds[color];
  const { lockup, strip } = playerSources(animation, color);
  fillLockup(/** @type {HTMLImageElement} */ (doc.getElementById('lockup')), lockup);
  fillStrip(/** @type {HTMLElement} */ (doc.getElementById('strip')), strip);
}

mountPlayer(document, location.search);

/** Functions exposed for the unit tests. */
/** @type {any} */ (globalThis).cdcPlayer = { resolvePlayer, playerSources, mountPlayer };
