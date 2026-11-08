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
 * The pattern tiles as reusable SVG fragments, and the belts built from them.
 *
 * @module pattern
 */

import { TILE } from './config.js';

/**
 * Take the drawing out of a master tile. Element ids are removed because the
 * same names repeat across tiles.
 *
 * @param {string} svg - Source text of a `Pattern*.svg` master.
 * @returns {string} The tile's content group.
 * @throws {Error} When the file has no content group.
 */
export function parseTile(svg) {
  const start = svg.indexOf('<g id="Content"');
  if (start === -1) {
    throw new Error('no content group in the pattern tile');
  }
  return svg
    .slice(start, svg.lastIndexOf('</g>') + '</g>'.length)
    .replace(/\sid="[^"]*"/g, '')
    .replace(/><\/(?:line|rect|circle|polygon|polyline|path)>/g, '/>');
}

/**
 * Write the tile definitions of one file.
 *
 * @param {string[]} tiles - Tile groups from {@link parseTile}.
 * @returns {string} A defs element.
 */
export function tileDefs(tiles) {
  const groups = tiles.map((tile, i) => tile.replace('<g ', `<g id="p${i}" `));
  return `<defs>${groups.join('')}</defs>`;
}

/**
 * Write a row of tiles. Short links bridge the seams, so anti-aliasing cannot
 * open a gap in the graph line when the row is scaled.
 *
 * @param {number} tileTypes - Number of different tiles, repeated in order.
 * @param {number} count - Number of tiles in the row.
 * @returns {string} Elements for the row.
 */
export function tileRow(tileTypes, count) {
  const uses = [];
  const links = [];
  for (let i = 0; i < count; i += 1) {
    const x = i * TILE.width;
    uses.push(`<use href="#p${i % tileTypes}" x="${x}"/>`);
    if (i > 0) {
      links.push(`<path d="M${x - 1},${TILE.linkY}h2"/>`);
    }
  }
  return `${uses.join('')}<g fill="none" stroke="currentColor" stroke-width="1.8">${links.join('')}</g>`;
}
