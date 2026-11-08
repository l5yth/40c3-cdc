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
 * Assembles the published site in `_site/` (SPEC D15).
 *
 * @module site
 */

import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCatalog } from './catalog.js';
import { ANIMATIONS, groundOf, PALETTE } from './config.js';
import { renderPage } from './page.js';

/**
 * The folder with the browser-side sources.
 *
 * @type {string}
 */
const SITE_SOURCES = join(dirname(fileURLToPath(import.meta.url)), 'site');

/**
 * The webfonts the page uses, from the official package.
 *
 * @type {ReadonlyArray<string>}
 */
const FONT_FILES = ['Hack-Regular.woff2', 'Hack-Bold.woff2', 'jersey-10-latin-400-normal.woff2'];

/**
 * Build the data the player needs, so its script stays free of imports.
 *
 * @returns {{animations: Object<string, ReadonlyArray<string>>, grounds: Object<string, string>}} The configuration.
 */
export function playerConfig() {
  const animations = Object.fromEntries(
    Object.entries(ANIMATIONS).map(([name, { colors }]) => [name, colors]),
  );
  const grounds = Object.fromEntries(Object.keys(PALETTE).map((key) => [key, groundOf(key)]));
  return { animations, grounds };
}

/**
 * Write the player page.
 *
 * @returns {string} HTML.
 */
export function renderPlayerPage() {
  const config = JSON.stringify(playerConfig()).replaceAll("'", '&#39;');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>40C3 CDC player</title>
<link rel="stylesheet" href="player.css">
</head>
<body data-config='${config}'>
<img id="lockup" alt="40C3 Critical Decentralisation" hidden>
<div id="strip" hidden></div>
<script src="player.js"></script>
</body>
</html>
`;
}

/**
 * Tell whether a file from `designs/` gets published.
 *
 * @param {string} source - Path of the file or folder.
 * @returns {boolean} False for README files.
 */
function isPublished(source) {
  return !basename(source).toUpperCase().startsWith('README');
}

/**
 * Write the published site. Only `_site/` is ever deleted.
 *
 * @param {string} root - Repository root.
 * @returns {void}
 */
export function assembleSite(root) {
  const out = join(root, '_site');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, 'play'), { recursive: true });
  mkdirSync(join(out, 'fonts'), { recursive: true });
  cpSync(join(root, 'embed'), join(out, 'embed'), { recursive: true });
  cpSync(join(root, 'assets'), join(out, 'assets'), { recursive: true });
  cpSync(join(root, 'designs'), join(out, 'designs'), { recursive: true, filter: isPublished });
  for (const name of FONT_FILES) {
    cpSync(join(root, 'upstream/40c3-styleguide/fonts', name), join(out, 'fonts', name));
  }
  writeFileSync(join(out, 'play/index.html'), renderPlayerPage());
  for (const name of ['player.js', 'player.css']) {
    cpSync(join(SITE_SOURCES, name), join(out, 'play', name));
  }
  writeFileSync(join(out, 'index.html'), renderPage(buildCatalog(root)));
  for (const name of ['copy.js', 'page.css']) {
    cpSync(join(SITE_SOURCES, name), join(out, name));
  }
}
