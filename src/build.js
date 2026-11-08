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
 * Build entry point. Writes the generated files into `embed/`, or with
 * `--check` reports whether the committed ones are current (SPEC D13).
 *
 * @module build
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderBanner } from './banner.js';
import { renderBlink } from './blink.js';
import { ANIMATIONS, STILL_SCALE, TILE } from './config.js';
import { renderConveyor, renderStrip } from './conveyor.js';
import { parseLockup } from './lockup.js';
import { parseTile } from './pattern.js';
import { decodePng, imagesMatch } from './png.js';
import { assembleSite } from './site.js';
import { renderTypewriter } from './typewriter.js';

/**
 * The repository root, derived from this file's location.
 *
 * @type {string}
 */
const REPOSITORY_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Generate every embed SVG.
 *
 * @param {string} root - Repository root to read masters from.
 * @returns {Map<string, string>} File content by file name.
 */
export function generateEmbeds(root) {
  /** @param {string} path - Path below the root. @returns {string} File content. */
  const read = (path) => readFileSync(join(root, path), 'utf8');
  const lockup = parseLockup(read('assets/logo/CDC_LogoText_5.svg'));
  const tiles = TILE.names.map((name) => parseTile(read(`assets/pattern/SVG/${name}.svg`)));
  /** @type {Map<string, string>} */
  const files = new Map();
  for (const [name, render] of Object.entries({
    typewriter: renderTypewriter,
    blink: renderBlink,
  })) {
    for (const color of ANIMATIONS[name].colors) {
      files.set(`${name}-${color}.svg`, render(lockup, { color, transparent: false }));
      files.set(`${name}-${color}-transparent.svg`, render(lockup, { color, transparent: true }));
    }
  }
  for (const color of ANIMATIONS.banner.colors) {
    files.set(`banner-${color}.svg`, renderBanner(lockup, tiles, { color, still: false }));
    files.set(`banner-${color}-still.svg`, renderBanner(lockup, tiles, { color, still: true }));
  }
  for (const color of ANIMATIONS.conveyor.colors) {
    files.set(`conveyor-${color}.svg`, renderConveyor(tiles, { color, transparent: false }));
    files.set(
      `conveyor-${color}-transparent.svg`,
      renderConveyor(tiles, { color, transparent: true }),
    );
    files.set(`strip-${color}.svg`, renderStrip(tiles, { color }));
  }
  return files;
}

/**
 * List the stills that also exist as PNG.
 *
 * @param {Map<string, string>} files - Generated SVG files by name.
 * @returns {string[]} SVG file names of the stills.
 */
export function stillNames(files) {
  return [...files.keys()].filter((name) => /-still\.svg$|^strip-/.test(name));
}

/**
 * List the files with one extension in a directory.
 *
 * @param {string} dir - Directory that may not exist yet.
 * @param {string} extension - File name ending.
 * @returns {string[]} File names.
 */
function listFiles(dir, extension) {
  return existsSync(dir) ? readdirSync(dir).filter((name) => name.endsWith(extension)) : [];
}

/**
 * Write the generated SVG files and delete SVG files that no longer exist.
 *
 * @param {string} dir - The `embed/` directory.
 * @param {Map<string, string>} files - File content by file name.
 * @returns {void}
 */
export function writeEmbeds(dir, files) {
  mkdirSync(dir, { recursive: true });
  for (const name of listFiles(dir, '.svg')) {
    if (!files.has(name)) {
      rmSync(join(dir, name));
    }
  }
  for (const [name, content] of files) {
    writeFileSync(join(dir, name), content);
  }
}

/**
 * Render one SVG to PNG.
 *
 * @param {string} svg - The SVG source text.
 * @returns {Buffer} The PNG file.
 */
function renderPng(svg) {
  return execFileSync('rsvg-convert', ['--zoom', String(STILL_SCALE)], {
    input: svg,
    maxBuffer: 2 ** 26,
  });
}

/**
 * Render the PNG versions of the stills and delete PNG files that no longer exist.
 *
 * @param {string} dir - The `embed/` directory.
 * @param {Map<string, string>} files - Generated SVG files by name.
 * @returns {void}
 */
export function writePngStills(dir, files) {
  const stills = stillNames(files);
  const pngs = new Set(stills.map((name) => name.replace(/svg$/, 'png')));
  for (const name of listFiles(dir, '.png')) {
    if (!pngs.has(name)) {
      rmSync(join(dir, name));
    }
  }
  for (const name of stills) {
    writeFileSync(join(dir, name.replace(/svg$/, 'png')), renderPng(String(files.get(name))));
  }
}

/**
 * Compare generated files with the ones on disk. PNG files are compared by
 * {@link compareStills}, this only checks that the right ones exist.
 *
 * @param {string} dir - The `embed/` directory.
 * @param {Map<string, string>} files - File content by file name.
 * @returns {string[]} One message per difference.
 */
export function compareEmbeds(dir, files) {
  const pngs = stillNames(files).map((name) => name.replace(/svg$/, 'png'));
  const problems = [
    ...listFiles(dir, '.svg').filter((name) => !files.has(name)),
    ...listFiles(dir, '.png').filter((name) => !pngs.includes(name)),
  ].map((name) => `stale file: ${name}`);
  for (const [name, content] of files) {
    const path = join(dir, name);
    if (!existsSync(path)) {
      problems.push(`missing file: ${name}`);
    } else if (readFileSync(path, 'utf8') !== content) {
      problems.push(`differs from a fresh build: ${name}`);
    }
  }
  for (const png of pngs) {
    if (!existsSync(join(dir, png))) {
      problems.push(`missing file: ${png}`);
    }
  }
  return problems;
}

/**
 * Compare the PNG stills on disk with a fresh render. The comparison is by
 * picture, not by bytes, because PNG bytes depend on the rasterizer version.
 *
 * @param {string} dir - The `embed/` directory.
 * @param {Map<string, string>} files - Generated SVG files by name.
 * @returns {string[]} One message per differing still.
 */
export function compareStills(dir, files) {
  const problems = [];
  for (const name of stillNames(files)) {
    const png = name.replace(/svg$/, 'png');
    const path = join(dir, png);
    if (
      existsSync(path) &&
      !imagesMatch(decodePng(readFileSync(path)), decodePng(renderPng(String(files.get(name)))))
    ) {
      problems.push(`differs from a fresh build: ${png}`);
    }
  }
  return problems;
}

/**
 * Run the build.
 *
 * @param {string[]} args - Command-line arguments: `--check`, `--root <dir>`.
 * @returns {number} Exit status.
 */
export function main(args) {
  const rootFlag = args.indexOf('--root');
  const root = rootFlag === -1 ? REPOSITORY_ROOT : args[rootFlag + 1];
  const dir = join(root, 'embed');
  const files = generateEmbeds(root);
  if (args.includes('--check')) {
    const problems = [...compareEmbeds(dir, files), ...compareStills(dir, files)];
    for (const problem of problems) {
      console.error(problem);
    }
    return problems.length === 0 ? 0 : 1;
  }
  writeEmbeds(dir, files);
  writePngStills(dir, files);
  assembleSite(root);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
