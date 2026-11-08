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
 * The `typewriter` embed (design 1a). Every character is its own element that
 * switches on at its moment, so the typing works on any ground (SPEC D7). The
 * resting state of the elements is the finished line, which is also the frame
 * shown under reduced motion.
 *
 * @module typewriter
 */

import { groundOf, PALETTE, TYPEWRITER_LINES, TYPEWRITER_MS, typewriterCycleMs } from './config.js';
import { cursorElement, cursorPosition, LOCKUP_LABEL, LOCKUP_VIEWBOX } from './lockup.js';
import { fmt, groundRect, pathElement, percent, REDUCED_MOTION, svgDocument } from './svg.js';

/** @import { Lockup } from './lockup.js' */

/**
 * Compute when a character appears.
 *
 * @param {number} index - Zero-based position in the whole text.
 * @returns {number} Moment in the cycle, in milliseconds.
 */
export function typedAt(index) {
  return TYPEWRITER_MS.blank + index * TYPEWRITER_MS.step;
}

/**
 * Find the cursor's cell after a number of typed characters. It moves to the
 * second line as soon as the first one is complete.
 *
 * @param {number} typed - Number of typed characters.
 * @returns {{line: number, cell: number}} Line and cell.
 */
export function cursorCell(typed) {
  const first = TYPEWRITER_LINES[0].length;
  return typed < first ? { line: 0, cell: typed } : { line: 1, cell: typed - first };
}

/**
 * Write the CSS that switches the characters on.
 *
 * @param {number} count - Number of characters.
 * @param {number} cycle - Cycle length in milliseconds.
 * @param {string} seconds - Cycle length as a CSS time.
 * @returns {string} CSS rules.
 */
function characterRules(count, cycle, seconds) {
  let css = '';
  for (let i = 0; i < count; i += 1) {
    css +=
      `.c${i}{animation:c${i} ${seconds} step-end infinite}` +
      `@keyframes c${i}{0%{opacity:0}${percent(typedAt(i), cycle)}{opacity:1}}`;
  }
  return css;
}

/**
 * Write the keyframes that walk the cursor along the text.
 *
 * @param {number} count - Number of characters.
 * @param {number} cycle - Cycle length in milliseconds.
 * @returns {string} A keyframes rule.
 */
function cursorMoveKeyframes(count, cycle) {
  const end = cursorPosition(1, TYPEWRITER_LINES[1].length);
  let frames = '';
  for (let typed = 0; typed <= count; typed += 1) {
    const { line, cell } = cursorCell(typed);
    const { x, y } = cursorPosition(line, cell);
    const at = typed === 0 ? 0 : typedAt(typed - 1);
    frames += `${percent(at, cycle)}{transform:translate(${fmt(x - end.x)}px,${fmt(y - end.y)}px)}`;
  }
  return `@keyframes m{${frames}}`;
}

/**
 * Write the keyframes that blink the cursor during the hold.
 *
 * @param {number} count - Number of characters.
 * @param {number} cycle - Cycle length in milliseconds.
 * @returns {string} A keyframes rule.
 */
function cursorBlinkKeyframes(count, cycle) {
  let frames = '0%{opacity:1}';
  const start = typedAt(count - 1);
  for (let flips = 1; start + flips * TYPEWRITER_MS.blink < cycle; flips += 1) {
    frames += `${percent(start + flips * TYPEWRITER_MS.blink, cycle)}{opacity:${flips % 2 === 0 ? 1 : 0}}`;
  }
  return `@keyframes b{${frames}}`;
}

/**
 * Write the typewriter embed.
 *
 * @param {Lockup} lockup - The parsed lockup.
 * @param {{color: string, transparent: boolean}} options - Palette index and ground choice.
 * @returns {string} The SVG file content.
 */
export function renderTypewriter(lockup, { color, transparent }) {
  const cells = lockup.lines.flat();
  const cycle = typewriterCycleMs();
  const seconds = `${cycle / 1000}s`;
  const style =
    characterRules(cells.length, cycle, seconds) +
    cursorMoveKeyframes(cells.length, cycle) +
    cursorBlinkKeyframes(cells.length, cycle) +
    `.k{animation:m ${seconds} step-end infinite,b ${seconds} step-end infinite}` +
    REDUCED_MOTION;
  const body = [
    ...(transparent ? [] : [groundRect(LOCKUP_VIEWBOX, groundOf(color))]),
    ...lockup.cube.map((path) => pathElement(path)),
    ...cells.map((d, i) => pathElement({ d }, `c${i}`)),
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
