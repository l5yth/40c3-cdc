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
 * Writes the embed page from the catalog (SPEC D11).
 *
 * @module page
 */

/** @import { Item, Section } from './catalog.js' */

/**
 * Escape text for use in HTML content and attribute values.
 *
 * @param {string} text - Raw text.
 * @returns {string} Escaped text.
 */
export function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * Write one item.
 *
 * @param {Item} item - The item.
 * @returns {string} HTML.
 */
function renderItem(item) {
  const preview = item.preview
    ? `<div class="preview" data-ground="${item.ground}"><img src="${escapeHtml(encodeURI(item.preview))}" alt="" loading="lazy"></div>`
    : '';
  const copy = item.snippet
    ? `<button type="button" data-copy="${escapeHtml(item.snippet)}">Copy embed</button>`
    : '';
  const play = item.play ? `<a data-play href="${escapeHtml(item.play)}">Fullscreen</a>` : '';
  const downloads = item.downloads
    .map(
      ({ label, href }) =>
        `<a data-download href="${escapeHtml(encodeURI(href))}" download>${escapeHtml(label)}</a>`,
    )
    .join('');
  return `<article class="item" data-item="${escapeHtml(item.stem)}">${preview}<h3>${escapeHtml(item.title)}</h3><p class="actions">${copy}${play}${downloads}</p></article>`;
}

/**
 * Write one section.
 *
 * @param {Section} section - The section.
 * @returns {string} HTML.
 */
function renderSection(section) {
  const items = section.items.map(renderItem).join('\n');
  return `<section data-section="${escapeHtml(section.id)}">\n<h2>${escapeHtml(section.title)}</h2>\n<div class="grid">\n${items}\n</div>\n</section>`;
}

/**
 * Write the page.
 *
 * @param {Section[]} sections - The catalog.
 * @returns {string} HTML.
 */
export function renderPage(sections) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>40C3 CDC design assets</title>
<meta name="description" content="Logos, patterns and animations of the Critical Decentralisation Cluster at 40C3.">
<link rel="stylesheet" href="page.css">
</head>
<body>
<header>
<img class="hero" src="embed/typewriter-5-transparent.svg" alt="40C3 Critical Decentralisation">
<h1>Design assets</h1>
<ul class="usage">
<li>Website: press Copy embed and paste the line into your page.</li>
<li>Projector: open Fullscreen in a browser.</li>
<li>Offline: download the file. It runs without a network.</li>
<li>License: CC0-1.0.</li>
</ul>
</header>
<main>
${sections.map(renderSection).join('\n')}
</main>
<footer>
<a href="https://github.com/l5yth/40c3-cdc">Source on GitHub</a>
<a href="https://events.ccc.de/congress/2026/infos/styleguide/">40C3 style guide</a>
</footer>
<script src="copy.js"></script>
</body>
</html>
`;
}
