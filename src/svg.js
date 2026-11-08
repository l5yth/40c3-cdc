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
 * Helpers that read the master SVG files and write the generated ones.
 *
 * @module svg
 */

/**
 * The header of every generated SVG file.
 *
 * @type {string}
 */
const HEADER =
  '<!-- SPDX-FileCopyrightText: 2026 l5yth -->\n<!-- SPDX-License-Identifier: CC0-1.0 -->\n';

/**
 * CSS that freezes an embed on its resting frame (SPEC D5).
 *
 * @type {string}
 */
export const REDUCED_MOTION = '@media (prefers-reduced-motion:reduce){*{animation:none!important}}';

/**
 * Format a number for SVG or CSS output, without float noise.
 *
 * @param {number} value - The number.
 * @returns {string} At most three decimals, no trailing zeros.
 */
export function fmt(value) {
  return String(Number(value.toFixed(3)));
}

/**
 * Format a moment as a keyframe selector.
 *
 * @param {number} ms - Moment in the cycle, in milliseconds.
 * @param {number} cycleMs - Cycle length in milliseconds.
 * @returns {string} A percentage with at most four decimals.
 */
export function percent(ms, cycleMs) {
  return `${Number(((ms / cycleMs) * 100).toFixed(4))}%`;
}

/**
 * Read the attributes of one tag.
 *
 * @param {string} text - The attribute part of a tag.
 * @returns {Record<string, string>} Attribute values by name.
 */
export function parseAttrs(text) {
  return Object.fromEntries([...text.matchAll(/([\w:-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
}

/**
 * Read every path element of a master file, ignoring its metadata.
 *
 * @param {string} svg - SVG source text.
 * @returns {Array<Record<string, string>>} Attributes of each path, in file order.
 */
export function extractPaths(svg) {
  return [...svg.matchAll(/<path\b([^>]*?)\s*\/?>/g)].map((m) => parseAttrs(m[1]));
}

/**
 * Split a path that only uses absolute commands into its subpaths.
 *
 * @param {string} d - Path data.
 * @returns {string[]} One entry per subpath.
 */
export function splitSubpaths(d) {
  return d.split(/(?=M)/).filter((part) => part.trim() !== '');
}

/**
 * Write a path element in the ink color.
 *
 * @param {Record<string, string>} attrs - Attributes of the master path.
 * @param {string} [className] - Optional class name.
 * @returns {string} A path element.
 */
export function pathElement(attrs, className) {
  const cls = className ? ` class="${className}"` : '';
  const transform = attrs.transform ? ` transform="${attrs.transform}"` : '';
  const rule = attrs['fill-rule'] ? ` fill-rule="${attrs['fill-rule']}"` : '';
  return `<path fill="currentColor"${cls}${transform}${rule} d="${attrs.d}"/>`;
}

/**
 * @typedef {object} SvgDocument
 * @property {string} viewBox - The viewBox attribute.
 * @property {string} color - Ink color, set on the root so `currentColor` works in an `img` tag.
 * @property {string} label - Accessible name.
 * @property {string} style - CSS rules.
 * @property {string} body - Inner elements.
 */

/**
 * Write a complete generated SVG file.
 *
 * @param {SvgDocument} doc - The document parts.
 * @returns {string} The file content.
 */
export function svgDocument({ viewBox, color, label, style, body }) {
  return (
    `${HEADER}<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" color="${color}"` +
    ` role="img" aria-label="${label}">\n<style>${style}</style>\n${body}\n</svg>\n`
  );
}

/**
 * Write a rectangle that fills a viewBox with a ground color.
 *
 * @param {string} viewBox - The viewBox attribute.
 * @param {string} color - The ground color.
 * @returns {string} A rect element.
 */
export function groundRect(viewBox, color) {
  const [x, y, width, height] = viewBox.split(' ');
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${color}"/>`;
}
