'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const helpers = require('../src/pwa-helpers.js');

const root = path.join(__dirname, '..');
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function readPngDimensions(relPath) {
  const buf = fs.readFileSync(path.join(root, relPath));
  assert.ok(buf.subarray(0, 8).equals(PNG_SIGNATURE), `${relPath} must be a valid PNG file`);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), bytes: buf.length };
}

test('PWA path exclusion strictly excludes Common Earth and server metadata while keeping PoI routes', () => {
  for (const excluded of [
    '/common-earth',
    '/common-earth/',
    '/common-earth/index.html',
    '/common-earth/app.js?v=123',
    '/common-earth/regions/0-0.bin',
    '/COMMON-EARTH/styles.css',
    'common-earth/index.html',
    '/server.js',
    '/package.json',
    '/package-lock.json',
    '/metadata.json'
  ]) {
    assert.equal(helpers.isExcludedFromPwaPath(excluded), true, `expected ${excluded} to be excluded`);
  }

  for (const included of [
    '/',
    '/index.html',
    '/manifest.webmanifest',
    '/styles.css?v=abc',
    '/src/app.js',
    '/assets/intelligence-portals.webp',
    '/assets/pwa-512x512.png',
    '/deneuraliser/',
    '/hidden/'
  ]) {
    assert.equal(helpers.isExcludedFromPwaPath(included), false, `expected ${included} to be included`);
  }
});

test('shouldCacheRequest and isNavigationFallbackAllowed enforce same-origin GET and exclude Common Earth', () => {
  const origin = 'https://www.philosophyofintelligence.life';
  assert.equal(helpers.shouldCacheRequest({ method: 'GET', origin, currentOrigin: origin, pathname: '/styles.css' }), true);
  assert.equal(helpers.shouldCacheRequest({ method: 'POST', origin, currentOrigin: origin, pathname: '/styles.css' }), false);
  assert.equal(helpers.shouldCacheRequest({ method: 'GET', origin: 'https://suno.com', currentOrigin: origin, pathname: '/embed/123' }), false);
  assert.equal(helpers.shouldCacheRequest({ method: 'GET', origin, currentOrigin: origin, pathname: '/common-earth/index.html' }), false);
  assert.equal(helpers.shouldCacheRequest({ method: 'GET', origin, currentOrigin: origin, pathname: '/dist/Philosophy-of-Intelligence-Offline.html' }), false);

  assert.equal(helpers.isNavigationFallbackAllowed({ mode: 'navigate', origin, currentOrigin: origin, pathname: '/' }), true);
  assert.equal(helpers.isNavigationFallbackAllowed({ mode: 'navigate', origin, currentOrigin: origin, pathname: '/common-earth/' }), false);
  assert.equal(helpers.isNavigationFallbackAllowed({ mode: 'cors', origin, currentOrigin: origin, pathname: '/' }), false);
});

test('platform detection and install button state handle iOS, iPadOS, Android, desktop, and standalone', () => {
  assert.equal(helpers.detectInstallPlatform({ isStandalone: true, userAgent: 'iPhone' }), 'standalone');
  assert.equal(helpers.detectInstallPlatform({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' }), 'ios');
  assert.equal(helpers.detectInstallPlatform({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', maxTouchPoints: 5 }), 'ios');
  assert.equal(helpers.detectInstallPlatform({ userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)' }), 'android');
  assert.equal(helpers.detectInstallPlatform({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/125.0' }), 'desktop');

  assert.deepEqual(helpers.getInstallButtonState({ isStandalone: true, hasDeferredPrompt: true, platform: 'android' }), {
    visible: false,
    action: 'prompt',
    label: 'Download app',
    platform: 'standalone'
  });
  assert.deepEqual(helpers.getInstallButtonState({ isStandalone: false, hasDeferredPrompt: true, platform: 'desktop' }), {
    visible: true,
    action: 'prompt',
    label: 'Download app',
    platform: 'desktop'
  });
  assert.deepEqual(helpers.getInstallButtonState({ isStandalone: false, hasDeferredPrompt: false, platform: 'ios' }), {
    visible: true,
    action: 'guide',
    label: 'Download app',
    platform: 'ios'
  });
});

test('manifest.webmanifest is valid, excludes Common Earth, and all referenced PNG icons exist with exact dimensions', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  const validation = helpers.validateManifest(manifest);
  assert.equal(validation.valid, true, `Manifest validation errors: ${validation.errors.join('; ')}`);
  assert.equal(manifest.short_name.length <= 12, true);
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');

  for (const icon of manifest.icons) {
    const [w, h] = icon.sizes.split('x').map(Number);
    const actual = readPngDimensions(icon.src);
    assert.equal(actual.width, w, `${icon.src} width should be ${w}`);
    assert.equal(actual.height, h, `${icon.src} height should be ${h}`);
  }

  const appleIcon = readPngDimensions('assets/apple-touch-icon.png');
  assert.equal(appleIcon.width, 180);
  assert.equal(appleIcon.height, 180);

  // Verify validator rejects invalid manifests
  const bad = helpers.validateManifest({ ...manifest, short_name: 'Way Too Long App Name', icons: [{ src: 'x.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }] });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.some(e => /12 characters/.test(e)));
  assert.ok(bad.errors.some(e => /combine/.test(e)));
});

test('sw.js passes syntax check, precaches only existing PoI assets, and bypasses /common-earth', () => {
  const swPath = path.join(root, 'sw.js');
  const check = spawnSync(process.execPath, ['--check', swPath], { encoding: 'utf8' });
  assert.equal(check.status, 0, check.stderr);

  const swSource = fs.readFileSync(swPath, 'utf8');
  const listeners = new Map();
  const selfObj = {
    location: { origin: 'https://www.philosophyofintelligence.life' },
    addEventListener(type, fn) { listeners.set(type, fn); },
    skipWaiting: () => Promise.resolve(),
    clients: { claim: () => Promise.resolve() }
  };
  let precached = [];
  const cachesObj = {
    open: async () => ({
      addAll: async urls => { precached = urls; },
      put: async () => {}
    }),
    keys: async () => [],
    delete: async () => true,
    match: async () => new Response('ok')
  };
  vm.runInNewContext(swSource, {
    self: selfObj,
    caches: cachesObj,
    URL,
    fetch: async () => new Response('ok')
  });

  // Trigger install and verify precache list
  let installPromise;
  listeners.get('install')({ waitUntil(p) { installPromise = p; } });
  return installPromise.then(() => {
    assert.ok(precached.length >= 20, 'SW should precache core Philosophy of Intelligence assets');
    for (const url of precached) {
      assert.equal(/common-earth/i.test(url), false, `SW must never precache ${url}`);
      if (url === '/') continue;
      const diskPath = path.join(root, url.replace(/^\//, ''));
      assert.equal(fs.existsSync(diskPath), true, `Precached asset missing on disk: ${url}`);
    }

    // Verify fetch handler bypasses /common-earth and cross-origin URLs
    const fetchHandler = listeners.get('fetch');
    for (const bypassUrl of [
      'https://www.philosophyofintelligence.life/common-earth',
      'https://www.philosophyofintelligence.life/common-earth/',
      'https://www.philosophyofintelligence.life/common-earth/index.html',
      'https://www.philosophyofintelligence.life/common-earth/app.js',
      'https://suno.com/embed/9d62272c-0a81-4f29-b6b0-52f03324b7b8'
    ]) {
      let responded = false;
      fetchHandler({
        request: { method: 'GET', url: bypassUrl, mode: 'navigate' },
        respondWith() { responded = true; }
      });
      assert.equal(responded, false, `SW must NOT intercept ${bypassUrl}`);
    }

    // Verify fetch handler DOES intercept PoI assets
    let poiResponded = false;
    fetchHandler({
      request: { method: 'GET', url: 'https://www.philosophyofintelligence.life/styles.css?v=123', mode: 'no-cors' },
      respondWith() { poiResponded = true; }
    });
    assert.equal(poiResponded, true, 'SW should handle PoI asset requests');
  });
});

test('index.html exposes Download app icon button, manifest, apple-touch-icon, and working PWA bootstrap', async () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /<link\b[^>]*rel="manifest"[^>]*href="manifest\.webmanifest"/i);
  assert.match(html, /<link\b[^>]*rel="apple-touch-icon"[^>]*href="assets\/apple-touch-icon\.png"/i);
  assert.match(html, /id="download-app-button"[^>]*>[\s\S]*?<svg\b[\s\S]*?<span>Download app<\/span>/i);

  const bootstrap = html.match(/<script id="pwa-bootstrap"[^>]*>([\s\S]*?)<\/script>/)[1];

  function createElement(id) {
    const el = new EventTarget();
    el.id = id;
    el.hidden = false;
    el.open = false;
    el.textContent = '';
    el.children = [];
    el.appendChild = child => el.children.push(child);
    el.setAttribute = (k, v) => { if (k === 'open') el.open = true; };
    el.removeAttribute = k => { if (k === 'open') el.open = false; };
    el.showModal = () => { el.open = true; };
    el.close = () => { el.open = false; };
    return el;
  }

  const elements = new Map([
    ['download-app-button', createElement('download-app-button')],
    ['pwa-install-dialog', createElement('pwa-install-dialog')],
    ['pwa-install-close', createElement('pwa-install-close')],
    ['pwa-install-confirm', createElement('pwa-install-confirm')],
    ['pwa-install-steps', createElement('pwa-install-steps')],
    ['pwa-install-lead', createElement('pwa-install-lead')],
    ['offline-indicator', createElement('offline-indicator')]
  ]);
  elements.get('pwa-install-confirm').hidden = true;
  elements.get('offline-indicator').hidden = true;

  const classes = new Set();
  const win = new EventTarget();
  let swRegistered = null;
  let onlineState = true;
  const nav = {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    maxTouchPoints: 5,
    standalone: false,
    get onLine() { return onlineState; },
    serviceWorker: {
      register: (script, opts) => {
        swRegistered = { script, opts };
        return Promise.resolve();
      }
    }
  };
  win.navigator = nav;
  win.matchMedia = () => ({ matches: false, addEventListener() {} });

  vm.runInNewContext(bootstrap, {
    window: win,
    navigator: nav,
    location: { protocol: 'https:', hostname: 'www.philosophyofintelligence.life' },
    document: {
      getElementById: id => elements.get(id) || null,
      createElement: tag => ({ tag, textContent: '' }),
      body: {
        classList: {
          toggle(name, force) { force ? classes.add(name) : classes.delete(name); },
          add(name) { classes.add(name); }
        }
      }
    }
  });

  // Load triggers SW registration at root scope
  win.dispatchEvent(new Event('load'));
  assert.equal(swRegistered.script, './sw.js');
  assert.equal(swRegistered.opts.scope, './');

  // Clicking Download app without beforeinstallprompt opens iOS guidance dialog
  elements.get('download-app-button').dispatchEvent(new Event('click'));
  assert.equal(elements.get('pwa-install-dialog').open, true);
  assert.ok(elements.get('pwa-install-steps').children.some(li => /Add to Home Screen/i.test(li.textContent)));

  // Close dialog
  elements.get('pwa-install-close').dispatchEvent(new Event('click'));
  assert.equal(elements.get('pwa-install-dialog').open, false);

  // Offline / online toggles indicator
  onlineState = false;
  win.dispatchEvent(new Event('offline'));
  assert.equal(elements.get('offline-indicator').hidden, false);
  onlineState = true;
  win.dispatchEvent(new Event('online'));
  assert.equal(elements.get('offline-indicator').hidden, true);

  // Capturing beforeinstallprompt invokes native prompt on click
  let prompted = false;
  const bip = new Event('beforeinstallprompt');
  bip.preventDefault = () => {};
  bip.prompt = async () => { prompted = true; };
  bip.userChoice = Promise.resolve({ outcome: 'accepted' });
  win.dispatchEvent(bip);
  elements.get('download-app-button').dispatchEvent(new Event('click'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(prompted, true);
  assert.equal(elements.get('download-app-button').hidden, true);
});
