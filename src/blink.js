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
 * The `blink` embed (design 1c). A static lockup whose eye closes every six
 * seconds and whose cursor blinks.
 *
 * @module blink
 */

import { BLINK_CYCLE_MS, groundOf, LOCKUP, PALETTE } from './config.js';
import { cursorElement, LOCKUP_LABEL, LOCKUP_VIEWBOX } from './lockup.js';
import { fmt, groundRect, pathElement, REDUCED_MOTION, svgDocument } from './svg.js';

/** @import { Lockup } from './lockup.js' */

/**
 * Radius of the closed eye. Larger than the hole, so the anti-aliased edge of
 * the hole cannot show as a hairline. The cube's top face hides the excess.
 *
 * @type {number}
 */
const LID_RADIUS = LOCKUP.eyeRadius + 0.25;

/**
 * Write the closed eye: a disc over the hole with a slit cut out of it, so the
 * slit shows whatever is behind the file (SPEC D7).
 *
 * @returns {string} Path data, for the even-odd fill rule.
 */
export function eyelidPath() {
  const { eyeX, eyeY, eyeRadius, slitInset, cursorHeight } = LOCKUP;
  const r = LID_RADIUS;
  const left = eyeX - eyeRadius + slitInset;
  const right = eyeX + eyeRadius - slitInset;
  const top = eyeY - cursorHeight / 2;
  const bottom = eyeY + cursorHeight / 2;
  return (
    `M${fmt(eyeX - r)},${fmt(eyeY)}a${fmt(r)},${fmt(r)} 0 1 0 ${fmt(2 * r)},0` +
    `a${fmt(r)},${fmt(r)} 0 1 0 ${fmt(-2 * r)},0Z` +
    `M${fmt(left)},${fmt(top)}H${fmt(right)}V${fmt(bottom)}H${fmt(left)}Z`
  );
}

/**
 * Write the blink embed.
 *
 * @param {Lockup} lockup - The parsed lockup.
 * @param {{color: string, transparent: boolean}} options - Palette index and ground choice.
 * @returns {string} The SVG file content.
 */
export function renderBlink(lockup, { color, transparent }) {
  const style =
    '.e{transform-box:fill-box;transform-origin:center;transform:scaleY(0);' +
    `animation:e ${BLINK_CYCLE_MS / 1000}s linear infinite}` +
    '@keyframes e{0%,94%{transform:scaleY(0)}94.5%,97.5%{transform:scaleY(1)}98%,100%{transform:scaleY(0)}}' +
    '.k{animation:k 1s step-end infinite}@keyframes k{50%{opacity:0}}' +
    REDUCED_MOTION;
  const body = [
    ...(transparent ? [] : [groundRect(LOCKUP_VIEWBOX, groundOf(color))]),
    ...lockup.cube.map((path) => pathElement(path)),
    ...lockup.lines.map((line) => pathElement({ d: line.join('') })),
    pathElement({ d: eyelidPath(), 'fill-rule': 'evenodd' }, 'e'),
    cursorElement('k'),
  ].join('\n');
  return svgDocument({
    viewBox: LOCKUP_VIEWBOX,
    color: PALETTE[color],
    label: LOCKUP_LABEL,
    style,
    body,
  });
}
