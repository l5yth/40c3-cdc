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
 * The `banner` embed (design 2b): the lockup above the rolling pattern belt in
 * a bordered box, and its still.
 *
 * @module banner
 */

import { BANNER, DARK, groundOf, NEUTRAL, PALETTE, TILE } from './config.js';
import { BELT_STYLE, beltElement } from './conveyor.js';
import { LOCKUP_LABEL } from './lockup.js';
import { tileDefs, tileRow } from './pattern.js';
import { fmt, groundRect, pathElement, svgDocument } from './svg.js';

/** @import { Lockup } from './lockup.js' */

/**
 * The banner's viewBox.
 *
 * @type {string}
 */
const BANNER_VIEWBOX = `0 0 ${BANNER.width} ${BANNER.height}`;

/**
 * Write the lockup at its place in the banner.
 *
 * @param {Lockup} lockup - The parsed lockup.
 * @returns {string} A positioned group.
 */
function lockupGroup(lockup) {
  const scale = BANNER.lockupHeight / BANNER.lockupNaturalHeight;
  const left = (BANNER.width - BANNER.lockupNaturalWidth * scale) / 2;
  const parts = [
    ...lockup.cube.map((path) => pathElement(path)),
    ...lockup.lines.map((line) => pathElement({ d: line.join('') })),
  ];
  return `<g transform="translate(${fmt(left)} ${BANNER.lockupTop}) scale(${scale.toFixed(5)})">${parts.join('')}</g>`;
}

/**
 * Write the strip area of the banner. It clips its content to the box and draws
 * the patterns in neutral, or in dark on the neutral ground (SPEC D8).
 *
 * @param {string} content - The tiles.
 * @param {string} color - Palette index of the banner.
 * @returns {string} A nested svg element.
 */
function stripArea(content, color) {
  const width = BANNER.width - 2 * BANNER.border;
  const ink = color === 'B' ? DARK : NEUTRAL;
  return (
    `<svg x="${BANNER.border}" y="${BANNER.stripTop}" width="${width}" height="${TILE.height}"` +
    ` viewBox="0 0 ${width} ${TILE.height}" color="${ink}">${content}</svg>`
  );
}

/**
 * Write the banner's border, inside its edge.
 *
 * @returns {string} A rect element.
 */
function borderRect() {
  const half = BANNER.border / 2;
  return (
    `<rect x="${half}" y="${half}" width="${BANNER.width - BANNER.border}"` +
    ` height="${BANNER.height - BANNER.border}" fill="none" stroke="currentColor"` +
    ` stroke-width="${BANNER.border}"/>`
  );
}

/**
 * Write the banner embed or its still.
 *
 * @param {Lockup} lockup - The parsed lockup.
 * @param {string[]} tiles - Tile groups.
 * @param {{color: string, still: boolean}} options - Palette index and motion choice.
 * @returns {string} The SVG file content.
 */
export function renderBanner(lockup, tiles, { color, still }) {
  const content = still ? tileRow(tiles.length, tiles.length) : beltElement(tiles);
  const body = [
    tileDefs(tiles),
    groundRect(BANNER_VIEWBOX, groundOf(color)),
    lockupGroup(lockup),
    stripArea(content, color),
    borderRect(),
  ].join('\n');
  return svgDocument({
    viewBox: BANNER_VIEWBOX,
    color: PALETTE[color],
    label: LOCKUP_LABEL,
    style: still ? '' : BELT_STYLE,
    body,
  });
}
