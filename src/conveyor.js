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
 * The `conveyor` embed (the strip of design 2b without the logo) and its still.
 *
 * @module conveyor
 */

import { CONVEYOR, groundOf, PALETTE, TILE } from './config.js';
import { tileDefs, tileRow } from './pattern.js';
import { groundRect, REDUCED_MOTION, svgDocument } from './svg.js';

/**
 * The viewBox of the conveyor and the strip: three tiles.
 *
 * @type {string}
 */
export const STRIP_VIEWBOX = `0 0 ${TILE.width * TILE.names.length} ${TILE.height}`;

/**
 * The accessible name of the pattern strip.
 *
 * @type {string}
 */
const STRIP_LABEL = 'Line art of radios, routers and a mesh network';

/**
 * CSS of the rolling belt: two units per step, 570 steps per minute (SPEC D5).
 *
 * @type {string}
 */
export const BELT_STYLE =
  `.b{animation:b ${CONVEYOR.seconds}s steps(${CONVEYOR.steps},end) infinite}` +
  `@keyframes b{to{transform:translateX(-${CONVEYOR.distance}px)}}${REDUCED_MOTION}`;

/**
 * Write the rolling belt: twice the visible tiles, so it can loop.
 *
 * @param {string[]} tiles - Tile groups.
 * @returns {string} A group of class `b`.
 */
export function beltElement(tiles) {
  return `<g class="b">${tileRow(tiles.length, tiles.length * 2)}</g>`;
}

/**
 * Write the conveyor embed.
 *
 * @param {string[]} tiles - Tile groups.
 * @param {{color: string, transparent: boolean}} options - Palette index and ground choice.
 * @returns {string} The SVG file content.
 */
export function renderConveyor(tiles, { color, transparent }) {
  const body = [
    tileDefs(tiles),
    ...(transparent ? [] : [groundRect(STRIP_VIEWBOX, groundOf(color))]),
    beltElement(tiles),
  ].join('\n');
  return svgDocument({
    viewBox: STRIP_VIEWBOX,
    color: PALETTE[color],
    label: STRIP_LABEL,
    style: BELT_STYLE,
    body,
  });
}

/**
 * Write the still three-tile strip.
 *
 * @param {string[]} tiles - Tile groups.
 * @param {{color: string}} options - Palette index.
 * @returns {string} The SVG file content.
 */
export function renderStrip(tiles, { color }) {
  const body = [
    tileDefs(tiles),
    groundRect(STRIP_VIEWBOX, groundOf(color)),
    tileRow(tiles.length, tiles.length),
  ].join('\n');
  return svgDocument({
    viewBox: STRIP_VIEWBOX,
    color: PALETTE[color],
    label: STRIP_LABEL,
    style: '',
    body,
  });
}
