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

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { findModuleProblems, findUndocumented } from '../src/docs-check.js';

test('a module-level function without a comment is reported', () => {
  const doclets = [
    { name: 'f', kind: 'function', memberof: 'module:a', undocumented: true },
    { name: 'g', kind: 'constant', memberof: 'module:a', undocumented: true },
  ];
  assert.deepEqual(findUndocumented(doclets), ['module:a/f', 'module:a/g']);
});

test('a symbol with a documented twin is not reported', () => {
  const doclets = [
    { name: 'f', kind: 'function', memberof: 'module:a' },
    { name: 'f', kind: 'function', memberof: 'module:a', undocumented: true },
  ];
  assert.deepEqual(findUndocumented(doclets), []);
});

test('locals, object keys and doclets without a kind are ignored', () => {
  const doclets = [
    { name: 'local', kind: 'constant', memberof: 'module:a.f', undocumented: true },
    { name: 'key', kind: 'member', scope: 'inner', memberof: 'module:a', undocumented: true },
    { name: 'plain', memberof: 'module:a', undocumented: true },
    { name: 'global', kind: 'function', scope: 'global', undocumented: true },
  ];
  assert.deepEqual(findUndocumented(doclets), []);
});

test('an exported variable is reported', () => {
  const doclets = [
    { name: 'a', kind: 'member', scope: 'static', memberof: 'module:m', undocumented: true },
  ];
  assert.deepEqual(findUndocumented(doclets), ['module:m/a']);
});

test('a comment on a nested or inner key does not excuse a symbol of that name', () => {
  const doclets = [
    { name: 'same', kind: 'member', scope: 'static', memberof: 'module:m~config' },
    { name: 'same', kind: 'member', scope: 'inner', memberof: 'module:m' },
    { name: 'same', kind: 'function', scope: 'static', memberof: 'module:m', undocumented: true },
  ];
  assert.deepEqual(findUndocumented(doclets), ['module:m/same']);
});

test('a repeated undocumented symbol is reported once', () => {
  const doclet = { name: 'f', kind: 'function', memberof: 'module:a', undocumented: true };
  assert.deepEqual(findUndocumented([doclet, { ...doclet }]), ['module:a/f']);
});

/**
 * Build the doclet of a module tag.
 *
 * @param {string} name - Module name.
 * @param {string} filename - File name in folder `/p`.
 * @returns {object} The doclet.
 */
function moduleDoclet(name, filename) {
  return { kind: 'module', name, meta: { path: '/p', filename } };
}

test('a tagged file with a unique module name is fine', () => {
  const doclets = [moduleDoclet('a', 'a.js'), { kind: 'package', files: ['/p/a.js'] }];
  assert.deepEqual(findModuleProblems(doclets), []);
});

test('a file without a module tag is reported', () => {
  const doclets = [moduleDoclet('a', 'a.js'), { kind: 'package', files: ['/p/a.js', '/p/b.js'] }];
  assert.deepEqual(findModuleProblems(doclets), ['no @module tag: /p/b.js']);
});

test('a module name used twice is reported once', () => {
  const doclets = [
    moduleDoclet('a', 'a.js'),
    moduleDoclet('a', 'b.js'),
    moduleDoclet('a', 'c.js'),
    { kind: 'package', files: ['/p/a.js', '/p/b.js', '/p/c.js'] },
  ];
  assert.deepEqual(findModuleProblems(doclets), ['duplicate module name: a']);
});

test('a module doclet without location data counts as no file', () => {
  const doclets = [
    { kind: 'module', name: 'a' },
    { kind: 'package', files: ['/p/a.js'] },
  ];
  assert.deepEqual(findModuleProblems(doclets), ['no @module tag: /p/a.js']);
});

/**
 * Run the checker as a command on one source file.
 *
 * @param {string} source - Content of the file.
 * @returns {import('node:child_process').SpawnSyncReturns<string>} The result.
 */
function runCheck(source) {
  const dir = mkdtempSync(join(tmpdir(), 'docs-check-'));
  writeFileSync(join(dir, 'sample.js'), source);
  return spawnSync(process.execPath, ['src/docs-check.js', dir], { encoding: 'utf8' });
}

test('the command passes on a fully documented file', () => {
  const result = runCheck(
    '/** @module sample */\n\n/** Say hello. */\nexport function hello() {}\n',
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /undocumented: 0/);
});

test('the command refuses a file without a module tag', () => {
  const result = runCheck('/** Say hello. */\nexport function hello() {}\n');
  assert.equal(result.status, 1);
  assert.match(result.stdout, /undocumented: 1\nno @module tag: .*sample\.js/);
});

test('the command fails and names an undocumented symbol', () => {
  const result = runCheck('/** @module sample */\nexport function hello() {}\n');
  assert.equal(result.status, 1);
  assert.match(result.stdout, /undocumented: 1\nmodule:sample\/hello/);
});

test('a comment on an object key on the same line does not excuse the constant', () => {
  const result = runCheck('/** @module sample */\nexport const config = { /** Doc. */ key: 1 };\n');
  assert.equal(result.status, 1);
  assert.match(result.stdout, /module:sample\/config/);
});

test('a commented key of an unnamed object does not excuse a function of that name', () => {
  const source = [
    '/** @module sample */',
    '',
    '/** List. */',
    'export const list = [',
    '  {',
    '    /** Key. */',
    '    same: 1,',
    '  },',
    '];',
    '',
    'export function same() {}',
    '',
  ];
  const result = runCheck(source.join('\n'));
  assert.equal(result.status, 1);
  assert.match(result.stdout, /module:sample\/same/);
});

test('an undocumented key of an unnamed object is not an API symbol', () => {
  const source = [
    '/** @module sample */',
    '',
    '/** List. */',
    'export const list = [{ key: 1 }];',
    '',
  ];
  const result = runCheck(source.join('\n'));
  assert.equal(result.status, 0, result.stdout);
});

test('the command fails when jsdoc rejects a comment', () => {
  const result = runCheck('/** @param {not a type} x - X. */\nexport function f(x) {}\n');
  assert.equal(result.status, 1);
  assert.match(result.stdout, /jsdoc reported errors/);
});
