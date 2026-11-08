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
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { deflateSync } from 'node:zlib';

import { decodePng, imagesMatch } from '../src/png.js';

/**
 * Write one PNG chunk. The CRC is not read by the decoder.
 *
 * @param {string} type - Chunk type.
 * @param {Buffer} data - Chunk data.
 * @returns {Buffer} The chunk.
 */
function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  return Buffer.concat([head, data, Buffer.alloc(4)]);
}

/**
 * Write a minimal PNG from raw, filtered rows.
 *
 * @param {number} width - Width in pixels.
 * @param {number} height - Height in pixels.
 * @param {number} colorType - PNG color type: 2 RGB, 6 RGBA.
 * @param {number[]} raw - Filter bytes and pixel bytes.
 * @returns {Buffer} The file.
 */
function png(width, height, colorType, raw) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = colorType;
  return Buffer.concat([
    Buffer.alloc(8),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.from(raw))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Build an RGB image of one color.
 *
 * @param {number} size - Width and height.
 * @param {number[]} color - Red, green and blue.
 * @returns {import('../src/png.js').Image} The image.
 */
function solid(size, color) {
  const data = Buffer.alloc(size * size * 3);
  for (let i = 0; i < data.length; i += 1) data[i] = color[i % 3];
  return { width: size, height: size, channels: 3, data };
}

test('decodePng reads the size and channels of RGB and RGBA files', () => {
  const rgb = decodePng(png(1, 1, 2, [0, 1, 2, 3]));
  assert.deepEqual([rgb.width, rgb.height, rgb.channels], [1, 1, 3]);
  assert.deepEqual([...rgb.data], [1, 2, 3]);
  const rgba = decodePng(png(1, 1, 6, [0, 1, 2, 3, 4]));
  assert.equal(rgba.channels, 4);
  assert.deepEqual([...rgba.data], [1, 2, 3, 4]);
});

test('decodePng undoes the sub, up and average filters', () => {
  const image = decodePng(
    png(2, 3, 2, [1, 10, 20, 30, 1, 2, 3, 2, 1, 1, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 1]),
  );
  assert.deepEqual(
    [...image.data],
    [10, 20, 30, 11, 22, 33, 11, 21, 31, 12, 23, 34, 6, 11, 16, 10, 18, 26],
  );
});

test('decodePng undoes the Paeth filter in all three of its cases', () => {
  const image = decodePng(png(2, 2, 2, [0, 10, 200, 100, 50, 10, 100, 4, 5, 5, 5, 1, 1, 1]));
  assert.deepEqual([...image.data], [10, 200, 100, 50, 10, 100, 15, 205, 105, 51, 11, 106]);
  const corner = decodePng(png(2, 2, 2, [0, 15, 15, 15, 20, 20, 20, 4, 251, 251, 251, 0, 0, 0]));
  assert.deepEqual([...corner.data.subarray(6)], [10, 10, 10, 15, 15, 15]);
});

test('decodePng reads a real file', () => {
  const image = decodePng(readFileSync('embed/strip-A.png'));
  assert.deepEqual([image.width, image.height], [2280, 210]);
});

test('images of different sizes do not match', () => {
  assert.equal(imagesMatch(solid(2, [0, 0, 0]), solid(3, [0, 0, 0])), false);
});

test('identical images and small color differences match', () => {
  assert.equal(imagesMatch(solid(4, [10, 20, 30]), solid(4, [10, 20, 30])), true);
  assert.equal(imagesMatch(solid(4, [10, 20, 30]), solid(4, [42, 52, 62])), true);
});

test('images with a clearly different color do not match', () => {
  assert.equal(imagesMatch(solid(4, [10, 20, 30]), solid(4, [10, 20, 200])), false);
});

test('a few differing pixels are tolerated, more are not', () => {
  const base = solid(100, [0, 0, 0]);
  const few = { ...base, data: Buffer.from(base.data) };
  for (let pixel = 0; pixel < 30; pixel += 1) few.data[pixel * 3] = 255;
  assert.equal(imagesMatch(base, few), true);
  few.data[30 * 3] = 255;
  assert.equal(imagesMatch(base, few), false);
});
