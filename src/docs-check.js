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
 * Gate for API documentation coverage. Biome has no rule that requires JSDoc,
 * so this reads the doclets of `jsdoc -X`. Two project rules keep that reliable:
 * every file has its own `@module` tag, checked here, and there are no default
 * exports, checked by Biome (`noDefaultExport`). Every API symbol then has
 * exactly one name inside one module.
 *
 * @module docs-check
 */

import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * @typedef {object} Doclet
 * @property {string} [name] - Symbol name.
 * @property {string} [kind] - Doclet kind, such as function or constant.
 * @property {string} [scope] - Doclet scope, such as static or inner.
 * @property {string} [memberof] - Longname of the parent symbol.
 * @property {boolean} [undocumented] - True when no comment was found.
 * @property {DocletMeta} [meta] - Where the symbol is defined.
 * @property {string[]} [files] - All parsed files, on the package doclet.
 */

/**
 * @typedef {object} DocletMeta
 * @property {string} path - Folder of the source file.
 * @property {string} filename - Name of the source file.
 */

/**
 * Doclet kinds that are always part of the API at the top level of a module.
 *
 * @type {ReadonlySet<string>}
 */
const API_KINDS = new Set(['function', 'class', 'constant']);

/**
 * Tell whether a doclet belongs to the API of a module. jsdoc also lists object
 * keys and destructured locals as inner members of a module, so a member only
 * counts when it is exported.
 *
 * @param {Doclet} doclet - The doclet to test.
 * @returns {boolean} True for an API symbol.
 */
function isApiSymbol(doclet) {
  const kind = doclet.kind ?? '';
  const inModule = /^module:[^.~#]+$/.test(doclet.memberof ?? '');
  return inModule && (API_KINDS.has(kind) || (kind === 'member' && doclet.scope !== 'inner'));
}

/**
 * Identify a symbol by its module and name.
 *
 * @param {Doclet} doclet - The doclet.
 * @returns {string} Its identity.
 */
function symbolKey(doclet) {
  return `${doclet.memberof}/${doclet.name}`;
}

/**
 * Find the top-level symbols that have no JSDoc comment. jsdoc reports an
 * exported symbol twice, once with and once without its comment, so a symbol
 * counts as documented when any of its API doclets is.
 *
 * @param {Doclet[]} doclets - The output of `jsdoc -X`.
 * @returns {string[]} Sorted keys of undocumented symbols.
 */
export function findUndocumented(doclets) {
  const api = doclets.filter(isApiSymbol);
  const documented = new Set(api.filter((doclet) => !doclet.undocumented).map(symbolKey));
  const missing = api.filter((doclet) => doclet.undocumented && !documented.has(symbolKey(doclet)));
  return [...new Set(missing.map(symbolKey))].sort();
}

/**
 * Find files that break the module rule: every file needs a `@module` tag, and
 * no two files may share a module name.
 *
 * @param {Doclet[]} doclets - The output of `jsdoc -X`.
 * @returns {string[]} Sorted problem descriptions.
 */
export function findModuleProblems(doclets) {
  const modules = doclets.filter((doclet) => doclet.kind === 'module');
  const tagged = new Set(modules.map(({ meta }) => (meta ? join(meta.path, meta.filename) : '')));
  const names = modules.map((doclet) => String(doclet.name));
  const untagged = doclets
    .flatMap((doclet) => doclet.files ?? [])
    .filter((file) => !tagged.has(file))
    .map((file) => `no @module tag: ${file}`);
  const repeated = names
    .filter((name, index) => names.indexOf(name) !== index)
    .map((name) => `duplicate module name: ${name}`);
  return [...new Set([...untagged, ...repeated])].sort();
}

/**
 * Run jsdoc over a directory and report problems.
 *
 * @param {string} dir - Directory to scan.
 * @returns {number} Exit status: 0 when every symbol is documented.
 */
export function main(dir) {
  let output = '';
  try {
    output = execFileSync(join('node_modules', '.bin', 'jsdoc'), ['-X', '-r', dir, '--pedantic'], {
      encoding: 'utf8',
      maxBuffer: 2 ** 26,
      stdio: ['ignore', 'pipe', 'inherit'],
    });
  } catch {
    console.log('jsdoc reported errors');
    return 1;
  }
  const doclets = JSON.parse(output);
  const problems = [...findModuleProblems(doclets), ...findUndocumented(doclets)];
  console.log(`undocumented: ${problems.length}`);
  for (const problem of problems) {
    console.log(problem);
  }
  return problems.length === 0 ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv[2]);
}
