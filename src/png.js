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
 * A small PNG reader, used to compare the committed PNG stills with a fresh
 * render, and by the end-to-end tests to read screenshots.
 *
 * @module png
 */

import { inflateSync } from 'node:zlib';

/**
 * @typedef {object} Image
 * @property {number} width - Width in pixels.
 * @property {number} height - Height in pixels.
 * @property {number} channels - Bytes per pixel.
 * @property {Buffer} data - Pixel bytes, row by row.
 */

/**
 * The largest difference per channel that still counts as the same pixel.
 * Rasterizer versions differ in their anti-aliasing.
 *
 * @type {number}
 */
const CHANNEL_TOLERANCE = 32;

/**
 * The share of pixels that may differ for two images to still match.
 *
 * @type {number}
 */
const DIFFERENT_PIXELS_ALLOWED = 0.003;

/**
 * Predict a byte the way one PNG filter does.
 *
 * @param {number} filter - Filter type of the row.
 * @param {number} left - The byte one pixel to the left.
 * @param {number} up - The byte one row above.
 * @param {number} corner - The byte above and to the left.
 * @returns {number} The prediction.
 */
function predict(filter, left, up, corner) {
  if (filter === 1) return left;
  if (filter === 2) return up;
  if (filter === 3) return (left + up) >> 1;
  if (filter !== 4) return 0;
  const estimate = left + up - corner;
  const toLeft = Math.abs(estimate - left);
  const toUp = Math.abs(estimate - up);
  const toCorner = Math.abs(estimate - corner);
  if (toLeft <= toUp && toLeft <= toCorner) return left;
  return toUp <= toCorner ? up : corner;
}

/**
 * Undo PNG scanline filtering.
 *
 * @param {Buffer} raw - Inflated image data, one filter byte per row.
 * @param {number} width - Image width.
 * @param {number} height - Image height.
 * @param {number} channels - Bytes per pixel.
 * @returns {Buffer} Pixels without filter bytes.
 */
function unfilter(raw, width, height, channels) {
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    for (let i = 0; i < stride; i += 1) {
      const left = i >= channels ? out[y * stride + i - channels] : 0;
      const up = y > 0 ? out[(y - 1) * stride + i] : 0;
      const corner = y > 0 && i >= channels ? out[(y - 1) * stride + i - channels] : 0;
      out[y * stride + i] =
        (raw[y * (stride + 1) + 1 + i] + predict(filter, left, up, corner)) & 255;
    }
  }
  return out;
}

/**
 * Decode an 8-bit, non-interlaced RGB or RGBA PNG.
 *
 * @param {Buffer} png - The file.
 * @returns {Image} The pixels.
 */
export function decodePng(png) {
  let position = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  /** @type {Buffer[]} */
  const parts = [];
  while (position < png.length) {
    const length = png.readUInt32BE(position);
    const type = png.toString('ascii', position + 4, position + 8);
    const chunk = png.subarray(position + 8, position + 8 + length);
    if (type === 'IHDR') {
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      channels = chunk[9] === 6 ? 4 : 3;
    }
    if (type === 'IDAT') parts.push(chunk);
    position += 12 + length;
  }
  return {
    width,
    height,
    channels,
    data: unfilter(inflateSync(Buffer.concat(parts)), width, height, channels),
  };
}

/**
 * Tell whether two images show the same picture, allowing for the small
 * differences between rasterizer versions. Only color channels are compared.
 *
 * @param {Image} a - First image.
 * @param {Image} b - Second image.
 * @returns {boolean} True when they match.
 */
export function imagesMatch(a, b) {
  if (a.width !== b.width || a.height !== b.height) {
    return false;
  }
  const pixels = a.width * a.height;
  let different = 0;
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    for (let channel = 0; channel < 3; channel += 1) {
      const delta = a.data[pixel * a.channels + channel] - b.data[pixel * b.channels + channel];
      if (Math.abs(delta) > CHANNEL_TOLERANCE) {
        different += 1;
        break;
      }
    }
  }
  return different <= pixels * DIFFERENT_PIXELS_ALLOWED;
}
