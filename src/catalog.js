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
 * Turns the repository tree into the sections and items of the page. New files
 * in a listed folder need no page work (SPEC D12).
 *
 * @module catalog
 */

import { readdirSync } from 'node:fs';
import { extname, join, posix } from 'node:path';

import { ANIMATIONS, SITE_URL } from './config.js';
import { LOCKUP_LABEL } from './lockup.js';

/**
 * @typedef {object} Item
 * @property {string} stem - File name without extension.
 * @property {string} title - Display title.
 * @property {(string|null)} preview - Relative URL of the preview image.
 * @property {string} ground - Preview background: `dark` or `light`.
 * @property {(string|null)} snippet - Copy-paste HTML, for images only.
 * @property {(string|null)} play - Fullscreen URL, for animations only.
 * @property {Array<{label: string, href: string}>} downloads - One link per format.
 */

/**
 * @typedef {object} Section
 * @property {string} id - Section identifier.
 * @property {string} title - Heading.
 * @property {Item[]} items - The items.
 */

/**
 * Image formats that can be previewed, in order of preference.
 *
 * @type {ReadonlyArray<string>}
 */
const IMAGE_FORMATS = ['svg', 'png', 'webp', 'jpg', 'jpeg', 'gif', 'avif'];

/**
 * Accessible text of the conveyor and strip embeds.
 *
 * @type {string}
 */
const STRIP_ALT = 'Line art of radios, routers and a mesh network';

/**
 * Section headings of the folders below `assets/`, in page order.
 *
 * @type {Object<string, string>}
 */
const ASSET_TITLES = { logo: 'Logos', pattern: 'Patterns', matrix: 'Matrix icons' };

/**
 * Item groups of the folders below `assets/`, in page order (SPEC D10). A folder
 * without an entry is sorted by file stem only.
 *
 * @type {Object<string, ReadonlyArray<RegExp>>}
 */
const ASSET_ORDER = {
  pattern: [/^Pattern\d+$/, /_neutral-on-transparent$/, /_dark-on-transparent$/, /_tiled-preview$/],
};

/**
 * Find the group of a file stem.
 *
 * @param {string} stem - File name without extension.
 * @param {ReadonlyArray<RegExp>} order - The groups in page order.
 * @returns {number} Index of the first matching group, or the number of groups when none matches.
 */
function groupRank(stem, order) {
  const rank = order.findIndex((group) => group.test(stem));
  return rank === -1 ? order.length : rank;
}

/**
 * Pick the preview background from a file stem: files with dark ink need the
 * light one.
 *
 * @param {string} stem - File name without extension.
 * @returns {string} `light` or `dark`.
 */
export function previewGround(stem) {
  return /(^|[-_])B($|[-_])|dark/.test(stem) ? 'light' : 'dark';
}

/**
 * Write the copy-paste snippet of an image.
 *
 * @param {string} path - Path below the site root.
 * @param {string} alt - Alternative text.
 * @returns {string} An img tag with an absolute URL.
 */
export function imageSnippet(path, alt) {
  return `<img src="${SITE_URL}${encodeURI(path)}" alt="${alt}">`;
}

/**
 * List the files below a folder, without README files.
 *
 * @param {string} root - Repository root.
 * @param {string} folder - Folder below the root, with forward slashes.
 * @returns {string[]} Sorted paths below the root.
 */
export function listFolder(root, folder) {
  return readdirSync(join(root, folder), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.toUpperCase().startsWith('README'))
    .map((entry) =>
      posix.join(
        folder,
        entry.parentPath.slice(join(root, folder).length).replaceAll('\\', '/'),
        entry.name,
      ),
    )
    .sort();
}

/**
 * Build one item from all formats of a file.
 *
 * @param {string} stem - File name without extension.
 * @param {string[]} paths - Paths of the formats, below the site root.
 * @returns {Item} The item.
 */
export function fileItem(stem, paths) {
  const byFormat = new Map(paths.map((path) => [extname(path).slice(1).toLowerCase(), path]));
  const format = IMAGE_FORMATS.find((candidate) => byFormat.has(candidate));
  const preview = format ? String(byFormat.get(format)) : null;
  const title = stem.replaceAll(/[-_]/g, ' ');
  return {
    stem,
    title,
    preview,
    ground: previewGround(stem),
    snippet: preview ? imageSnippet(preview, title) : null,
    play: null,
    downloads: [...byFormat].map(([label, href]) => ({ label: label.toUpperCase(), href })),
  };
}

/**
 * Turn a list of files into items, one per stem.
 *
 * @param {string[]} paths - Paths below the site root.
 * @param {ReadonlyArray<RegExp>} [order] - Item groups in page order. A stem in no group comes last.
 * @returns {Item[]} Items sorted by group, then by stem.
 */
export function groupItems(paths, order = []) {
  /** @type {Map<string, string[]>} */
  const groups = new Map();
  for (const path of paths) {
    const stem = posix.basename(path, posix.extname(path));
    groups.set(stem, [...(groups.get(stem) ?? []), path]);
  }
  return [...groups]
    .sort(([a], [b]) => groupRank(a, order) - groupRank(b, order) || (a < b ? -1 : 1))
    .map(([stem, files]) => fileItem(stem, files));
}

/**
 * Build the item of one animation file.
 *
 * @param {string} animation - Animation name.
 * @param {string} color - Palette index.
 * @param {boolean} transparent - Whether the file has no ground.
 * @returns {Item} The item.
 */
export function animationItem(animation, color, transparent) {
  const stem = `${animation}-${color}${transparent ? '-transparent' : ''}`;
  const href = `embed/${stem}.svg`;
  return {
    stem,
    title: stem.replaceAll('-', ' '),
    preview: href,
    ground: previewGround(stem),
    snippet: imageSnippet(href, animation === 'conveyor' ? STRIP_ALT : LOCKUP_LABEL),
    play: `${SITE_URL}play/?a=${animation}&c=${color}`,
    downloads: [{ label: 'SVG', href }],
  };
}

/**
 * Build the section of the animations.
 *
 * @returns {Section} The section.
 */
export function animationSection() {
  const items = Object.entries(ANIMATIONS).flatMap(([name, { colors, transparent }]) =>
    colors.flatMap((color) => [
      animationItem(name, color, false),
      ...(transparent ? [animationItem(name, color, true)] : []),
    ]),
  );
  return { id: 'animations', title: 'Animations', items };
}

/**
 * Build the section of the generated stills.
 *
 * @returns {Section} The section.
 */
export function stillSection() {
  const stems = [
    ...ANIMATIONS.banner.colors.map((color) => `banner-${color}-still`),
    ...ANIMATIONS.conveyor.colors.map((color) => `strip-${color}`),
  ];
  const items = stems.map((stem) => fileItem(stem, [`embed/${stem}.svg`, `embed/${stem}.png`]));
  return { id: 'stills', title: 'Stills', items };
}

/**
 * Build one section per folder below a parent folder. Folders with a known
 * title come first, in the order of `titles`, then the rest by name.
 *
 * @param {string} root - Repository root.
 * @param {string} parent - Parent folder, such as `assets` or `designs`.
 * @param {Object<string, string>} [titles] - Section headings by folder name.
 * @param {Object<string, ReadonlyArray<RegExp>>} [orders] - Item groups by folder name.
 * @returns {Section[]} The sections.
 */
export function folderSections(root, parent, titles = {}, orders = {}) {
  const folders = readdirSync(join(root, parent), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const known = Object.keys(titles).filter((name) => folders.includes(name));
  const others = folders.filter((name) => !Object.hasOwn(titles, name));
  return [...known, ...others].map((name) => ({
    id: name,
    title: titles[name] ?? name,
    items: groupItems(listFolder(root, `${parent}/${name}`), orders[name]),
  }));
}

/**
 * Build all sections of the page.
 *
 * @param {string} root - Repository root.
 * @returns {Section[]} The sections in page order.
 */
export function buildCatalog(root) {
  return [
    animationSection(),
    stillSection(),
    ...folderSections(root, 'assets', ASSET_TITLES, ASSET_ORDER),
    ...folderSections(root, 'designs'),
  ];
}
