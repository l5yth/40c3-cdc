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
 * Constants shared by the embed generator, the page and the player. The values
 * come from SPEC D5, D8 and section 3, which copy them from the 40C3 design
 * project.
 *
 * @module config
 */

/**
 * The public address of the published site, with a trailing slash.
 *
 * @type {string}
 */
export const SITE_URL = 'https://l5yth.github.io/40c3-cdc/';

/**
 * The dark ground of the 40C3 palette (index B).
 *
 * @type {string}
 */
export const DARK = '#001300';

/**
 * The neutral ground of the 40C3 palette (index A).
 *
 * @type {string}
 */
export const NEUTRAL = '#ebedf0';

/**
 * Ink colors by 40C3 palette index.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const PALETTE = Object.freeze({ 0: '#75b44b', 5: '#ea6f82', A: NEUTRAL, B: DARK });

/**
 * Return the ground color that goes with a palette index.
 *
 * @param {string} color - Palette index.
 * @returns {string} The neutral ground for index B, otherwise the dark ground.
 */
export function groundOf(color) {
  return color === 'B' ? NEUTRAL : DARK;
}

/**
 * @typedef {object} AnimationConfig
 * @property {ReadonlyArray<string>} colors - Palette indices, the default first.
 * @property {boolean} transparent - Whether a version without ground exists.
 */

/**
 * The animations, as named in SPEC D4 and D8.
 *
 * @type {Readonly<Record<string, AnimationConfig>>}
 */
export const ANIMATIONS = Object.freeze({
  typewriter: Object.freeze({ colors: ['5', 'A', 'B'], transparent: true }),
  blink: Object.freeze({ colors: ['5', 'A', 'B'], transparent: true }),
  banner: Object.freeze({ colors: ['5', 'A', 'B'], transparent: false }),
  conveyor: Object.freeze({ colors: ['A', '5', '0', 'B'], transparent: true }),
});

/**
 * The typewriter's text, one string per wordmark line.
 *
 * @type {ReadonlyArray<string>}
 */
export const TYPEWRITER_LINES = Object.freeze(['40C3_CRITICAL_', 'DECENTRALISATION']);

/**
 * Typewriter timing in milliseconds (SPEC D5).
 *
 * @type {Readonly<{blank: number, step: number, hold: number, blink: number}>}
 */
export const TYPEWRITER_MS = Object.freeze({ blank: 700, step: 90, hold: 6000, blink: 500 });

/**
 * Blink cycle length in milliseconds (SPEC D5).
 *
 * @type {number}
 */
export const BLINK_CYCLE_MS = 6000;

/**
 * Conveyor motion (SPEC D5).
 *
 * @type {Readonly<{distance: number, seconds: number, steps: number}>}
 */
export const CONVEYOR = Object.freeze({ distance: 1140, seconds: 60, steps: 570 });

/**
 * Size of a pattern tile, and the master tiles in conveyor order (SPEC section 3).
 *
 * @type {Readonly<{width: number, height: number, linkY: number, names: ReadonlyArray<string>}>}
 */
export const TILE = Object.freeze({
  width: 380,
  height: 105,
  linkY: 12,
  names: Object.freeze(['Pattern4', 'Pattern5', 'Pattern6']),
});

/**
 * Layout of the banner in design pixels (SPEC section 3).
 *
 * @type {Readonly<Record<string, number>>}
 */
export const BANNER = Object.freeze({
  width: 680,
  height: 331,
  border: 2,
  lockupTop: 42,
  lockupHeight: 150,
  lockupNaturalHeight: 88.42,
  lockupNaturalWidth: 264.8,
  stripTop: 224,
});

/**
 * Scale of the PNG stills relative to their SVG size (SPEC D10).
 *
 * @type {number}
 */
export const STILL_SCALE = 2;

/**
 * Lockup geometry in viewBox units (SPEC section 3).
 *
 * @type {Readonly<Record<string, number>>}
 */
export const LOCKUP = Object.freeze({
  cell: 11.73,
  cellX: 78.9,
  cursorInset: 0.74,
  cursorWidth: 9.37,
  cursorHeight: 1.77,
  cursorY1: 48.89,
  cursorY2: 72.11,
  eyeX: 33.82,
  eyeY: 27.36,
  eyeRadius: 10.16,
  slitInset: 0.59,
});

/**
 * Compute the typewriter's loop length (SPEC D5).
 *
 * @returns {number} Loop length in milliseconds.
 */
export function typewriterCycleMs() {
  const cells = TYPEWRITER_LINES.join('').length;
  return TYPEWRITER_MS.blank + (cells - 1) * TYPEWRITER_MS.step + TYPEWRITER_MS.hold;
}
