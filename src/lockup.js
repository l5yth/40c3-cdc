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
 * The CDC lockup as parts the animations can address: the cube and one element
 * per wordmark character.
 *
 * @module lockup
 */

import { LOCKUP, TYPEWRITER_LINES } from './config.js';
import { extractPaths, fmt, splitSubpaths } from './svg.js';

/**
 * The viewBox of `typewriter` and `blink`: the lockup with the design's padding.
 *
 * @type {string}
 */
export const LOCKUP_VIEWBOX = '-18.86 -18.86 302.52 126.14';

/**
 * The accessible name of the lockup.
 *
 * @type {string}
 */
export const LOCKUP_LABEL = '40C3 Critical Decentralisation';

/**
 * @typedef {object} Lockup
 * @property {Array<Record<string, string>>} cube - Attributes of the five cube paths.
 * @property {string[][]} lines - Path data per character cell, per wordmark line.
 */

/**
 * Group the subpaths of one wordmark line by character cell. Hack is monospace,
 * so the first point of each subpath tells its cell.
 *
 * @param {string} d - Path data of the line.
 * @param {number} count - Number of cells on the line.
 * @returns {string[]} Path data per cell.
 * @throws {Error} When a subpath falls outside the line or a cell stays empty.
 */
export function splitCells(d, count) {
  /** @type {string[]} */
  const cells = new Array(count).fill('');
  for (const subpath of splitSubpaths(d)) {
    const index = Math.floor((Number.parseFloat(subpath.slice(1)) - LOCKUP.cellX) / LOCKUP.cell);
    if (index < 0 || index >= count) {
      throw new Error(`subpath outside the wordmark line: ${subpath.slice(0, 20)}`);
    }
    cells[index] += subpath;
  }
  if (cells.includes('')) {
    throw new Error(`empty character cell at index ${cells.indexOf('')}`);
  }
  return cells;
}

/**
 * Parse the master lockup file.
 *
 * @param {string} svg - Source text of `CDC_LogoText_*.svg`.
 * @returns {Lockup} The lockup parts.
 * @throws {Error} When the file does not have the expected seven paths.
 */
export function parseLockup(svg) {
  const paths = extractPaths(svg);
  if (paths.length !== 7) {
    throw new Error(`expected 7 paths in the lockup, found ${paths.length}`);
  }
  return {
    cube: paths.slice(0, 5),
    lines: TYPEWRITER_LINES.map((line, i) => splitCells(paths[5 + i].d, line.length)),
  };
}

/**
 * Compute where the cursor sits.
 *
 * @param {number} line - Wordmark line, 0 or 1.
 * @param {number} cell - Character cell.
 * @returns {{x: number, y: number}} Top-left corner in viewBox units.
 */
export function cursorPosition(line, cell) {
  return {
    x: LOCKUP.cellX + LOCKUP.cell * cell + LOCKUP.cursorInset,
    y: line === 0 ? LOCKUP.cursorY1 : LOCKUP.cursorY2,
  };
}

/**
 * Write the cursor bar at the end of the wordmark.
 *
 * @param {string} className - Class name of the element.
 * @returns {string} A rect element.
 */
export function cursorElement(className) {
  const { x, y } = cursorPosition(1, TYPEWRITER_LINES[1].length);
  return (
    `<rect class="${className}" x="${fmt(x)}" y="${fmt(y)}"` +
    ` width="${LOCKUP.cursorWidth}" height="${LOCKUP.cursorHeight}" fill="currentColor"/>`
  );
}
