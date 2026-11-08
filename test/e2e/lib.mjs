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
 * Tools for the end-to-end tests: a static file server, a headless Chromium
 * driven over the DevTools protocol, and pixel access to its screenshots.
 *
 * @module e2e-lib
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';

import { decodePng } from '../../src/png.js';

/**
 * Content types of the served files.
 *
 * @type {Record<string, string>}
 */
const TYPES = {
  '.css': 'text/css',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/**
 * A page that inlines an SVG file and, when asked, freezes its animations at
 * one moment. Inlining exposes the animations to `document.getAnimations()`.
 *
 * @type {string}
 */
const SEEK_PAGE = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;background:#fff}svg{display:block;width:100vw;height:100vh}</style>
<body><script>
const q = new URLSearchParams(location.search);
fetch(q.get('f')).then((r) => r.text()).then((s) => {
  document.body.insertAdjacentHTML('beforeend', s);
  if (q.has('t')) {
    for (const a of document.getAnimations()) { a.pause(); a.currentTime = Number(q.get('t')); }
  }
  window.__ready = true;
});
</script></body>`;

/**
 * Serve a directory over HTTP on a free local port.
 *
 * @param {string} root - Directory to serve.
 * @param {Record<string, string>} [pages] - Extra HTML pages by URL path.
 * @returns {Promise<{origin: string, close: () => Promise<unknown>}>} The running server.
 */
export async function serve(root, pages = {}) {
  /** @type {Record<string, string>} */
  const routes = { '/__seek.html': SEEK_PAGE, ...pages };
  const server = createServer((request, response) => {
    const path = new URL(request.url ?? '/', 'http://local').pathname;
    if (routes[path]) {
      response.writeHead(200, { 'content-type': TYPES['.html'] });
      response.end(routes[path]);
      return;
    }
    let file = join(root, normalize(decodeURIComponent(path)));
    if (existsSync(file) && statSync(file).isDirectory()) {
      file = join(file, 'index.html');
    }
    if (!existsSync(file)) {
      response.writeHead(404);
      response.end();
      return;
    }
    response.writeHead(200, {
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    });
    response.end(readFileSync(file));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(null)));
  const address = /** @type {import('node:net').AddressInfo} */ (server.address());
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

/**
 * Pixels of one screenshot.
 */
export class Frame {
  /**
   * @param {number} width - Image width.
   * @param {number} height - Image height.
   * @param {number} channels - Bytes per pixel.
   * @param {Buffer} data - Pixel bytes.
   */
  constructor(width, height, channels, data) {
    this.width = width;
    this.height = height;
    this.channels = channels;
    this.data = data;
  }

  /**
   * Read one pixel.
   *
   * @param {number} x - Column.
   * @param {number} y - Row.
   * @returns {number[]} Red, green and blue.
   */
  at(x, y) {
    const i = (Math.floor(y) * this.width + Math.floor(x)) * this.channels;
    return [this.data[i], this.data[i + 1], this.data[i + 2]];
  }

  /**
   * Count pixels of a color inside a pixel rectangle.
   *
   * @param {{left: number, top: number, right: number, bottom: number}} box - The rectangle.
   * @param {number[]} color - Red, green and blue.
   * @param {number} [tolerance] - Largest allowed difference per channel.
   * @returns {number} Number of matching pixels.
   */
  count(box, color, tolerance = 40) {
    let hits = 0;
    for (let y = Math.max(0, Math.ceil(box.top)); y < Math.min(this.height, box.bottom); y += 1) {
      for (let x = Math.max(0, Math.ceil(box.left)); x < Math.min(this.width, box.right); x += 1) {
        if (near(this.at(x, y), color, tolerance)) hits += 1;
      }
    }
    return hits;
  }
}

/**
 * Compare two colors.
 *
 * @param {number[]} a - First color.
 * @param {number[]} b - Second color.
 * @param {number} [tolerance] - Largest allowed difference per channel.
 * @returns {boolean} True when the colors match.
 */
export function near(a, b, tolerance = 40) {
  return a.every((value, i) => Math.abs(value - b[i]) <= tolerance);
}

/**
 * Find the Chromium binary.
 *
 * @returns {string} A command name or path.
 * @throws {Error} When no browser is installed.
 */
function chromeBinary() {
  if (process.env.CHROME) return process.env.CHROME;
  for (const name of ['chromium', 'chromium-browser', 'google-chrome', 'chrome']) {
    if (spawnSync('which', [name]).status === 0) return name;
  }
  throw new Error('no Chromium found; set CHROME');
}

/**
 * One browser tab, driven over the DevTools protocol.
 */
export class Browser {
  /**
   * @param {import('node:child_process').ChildProcess} process - The browser.
   * @param {WebSocket} socket - The tab's DevTools socket.
   * @param {string} profile - Temporary profile directory.
   */
  constructor(process, socket, profile) {
    this.process = process;
    this.socket = socket;
    this.profile = profile;
    this.nextId = 0;
    /** @type {Map<number, {resolve: (value: any) => void, reject: (error: Error) => void}>} */
    this.pending = new Map();
    /** @type {string[]} */
    this.requests = [];
    /** @type {string[]} */
    this.consoleErrors = [];
    socket.addEventListener('message', (event) => this.receive(String(event.data)));
  }

  /**
   * Handle one message from the browser.
   *
   * @param {string} text - The JSON message.
   * @returns {void}
   */
  receive(text) {
    const message = JSON.parse(text);
    if (message.id && this.pending.has(message.id)) {
      const waiter = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) waiter?.reject(new Error(message.error.message));
      else waiter?.resolve(message.result);
      return;
    }
    if (message.method === 'Network.requestWillBeSent') {
      this.requests.push(message.params.request.url);
    }
    if (message.method === 'Runtime.exceptionThrown') {
      this.consoleErrors.push(message.params.exceptionDetails.text);
    }
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
      this.consoleErrors.push(message.params.entry.text);
    }
  }

  /**
   * Send a DevTools command.
   *
   * @param {string} method - Command name.
   * @param {object} [params] - Command parameters.
   * @returns {Promise<any>} The command's result.
   */
  send(method, params = {}) {
    this.nextId += 1;
    const id = this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  /**
   * Set the viewport size.
   *
   * @param {number} width - Width in pixels.
   * @param {number} height - Height in pixels.
   * @returns {Promise<void>}
   */
  async viewport(width, height) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });
  }

  /**
   * Turn emulation of the reduced-motion preference on or off.
   *
   * @param {boolean} on - Whether reduced motion is requested.
   * @returns {Promise<void>}
   */
  async reducedMotion(on) {
    await this.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: on ? 'reduce' : '' }],
    });
  }

  /**
   * Evaluate an expression in the page.
   *
   * @param {string} expression - JavaScript source.
   * @returns {Promise<any>} The value.
   */
  async evaluate(expression) {
    const { result, exceptionDetails } = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (exceptionDetails) throw new Error(exceptionDetails.text);
    return result.value;
  }

  /**
   * Wait until an expression becomes true.
   *
   * @param {string} expression - JavaScript source.
   * @returns {Promise<void>}
   * @throws {Error} After five seconds.
   */
  async waitFor(expression) {
    const deadline = Date.now() + 5000;
    while (!(await this.evaluate(expression))) {
      if (Date.now() > deadline) throw new Error(`timed out waiting for ${expression}`);
      await sleep(10);
    }
  }

  /**
   * Open a URL and wait until it has loaded.
   *
   * @param {string} url - The URL.
   * @returns {Promise<void>}
   */
  async goto(url) {
    await this.send('Page.navigate', { url });
    await sleep(20);
    await this.waitFor('document.readyState === "complete"');
  }

  /**
   * Take a screenshot.
   *
   * @returns {Promise<Frame>} The pixels.
   */
  async screenshot() {
    await this.evaluate(
      'new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))))',
    );
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' });
    const image = decodePng(Buffer.from(data, 'base64'));
    return new Frame(image.width, image.height, image.channels, image.data);
  }

  /**
   * Render an SVG file at one moment of its animation.
   *
   * @param {string} origin - Server origin.
   * @param {string} path - URL path of the SVG file.
   * @param {number} [time] - Moment in milliseconds. Omitted, the animation is left alone.
   * @returns {Promise<Frame>} The pixels.
   */
  async seek(origin, path, time) {
    const moment = time === undefined ? '' : `&t=${time}`;
    await this.goto(`${origin}/__seek.html?f=${encodeURIComponent(path)}${moment}`);
    await this.waitFor('window.__ready === true');
    return this.screenshot();
  }

  /**
   * Close the browser and delete its profile.
   *
   * @returns {void}
   */
  close() {
    this.socket.close();
    this.process.kill();
    rmSync(this.profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}

/**
 * Wait.
 *
 * @param {number} ms - Milliseconds.
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Start a headless Chromium with one open tab. Set `reducedMotion` to give the
 * browser a real reduced-motion preference: emulation over the DevTools protocol
 * does not reach SVG files shown as images.
 *
 * @param {{reducedMotion?: boolean}} [options] - Launch options.
 * @returns {Promise<Browser>} The browser.
 */
export async function launch({ reducedMotion = false } = {}) {
  const profile = mkdtempSync(join(tmpdir(), 'cdc-e2e-'));
  const flags = [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    ...(process.env.CI ? ['--no-sandbox'] : []),
    ...(reducedMotion ? ['--force-prefers-reduced-motion'] : []),
    'about:blank',
  ];
  const child = spawn(chromeBinary(), flags, { stdio: ['ignore', 'ignore', 'pipe'] });
  const port = await new Promise((resolve, reject) => {
    let output = '';
    child.stderr?.on('data', (chunk) => {
      output += chunk;
      const match = output.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//);
      if (match) resolve(match[1]);
    });
    child.on('exit', () => reject(new Error(`Chromium exited: ${output}`)));
  });
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const tab = targets.find((/** @type {{type: string}} */ target) => target.type === 'page');
  const socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve) => socket.addEventListener('open', resolve));
  const browser = new Browser(child, socket, profile);
  for (const domain of ['Page', 'Runtime', 'Network', 'Log']) {
    await browser.send(`${domain}.enable`);
  }
  return browser;
}

/**
 * Build the function that maps viewBox units to screenshot pixels, for an SVG
 * that fills the viewport with the default aspect-ratio handling.
 *
 * @param {string} viewBox - The file's viewBox.
 * @param {number} width - Viewport width.
 * @param {number} height - Viewport height.
 * @returns {(box: {x: number, y: number, w: number, h: number}) => {left: number, top: number, right: number, bottom: number}} The mapping.
 */
export function mapper(viewBox, width, height) {
  const [minX, minY, boxWidth, boxHeight] = viewBox.split(' ').map(Number);
  const scale = Math.min(width / boxWidth, height / boxHeight);
  const offsetX = (width - boxWidth * scale) / 2;
  const offsetY = (height - boxHeight * scale) / 2;
  return ({ x, y, w, h }) => ({
    left: offsetX + (x - minX) * scale,
    top: offsetY + (y - minY) * scale,
    right: offsetX + (x + w - minX) * scale,
    bottom: offsetY + (y + h - minY) * scale,
  });
}
