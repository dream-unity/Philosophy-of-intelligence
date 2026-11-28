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
  assert.equal(helpers.shouldShowDownloadButton({ isStandalone: false }), true);
  assert.equal(helpers.shouldShowDownloadButton({ isStandalone: true }), false);
  assert.equal(helpers.shouldShowMusicPlayer({ isStandalone: false, isOnline: true }), true);
  assert.equal(helpers.shouldShowMusicPlayer({ isStandalone: true, isOnline: true }), false);
  assert.equal(helpers.shouldShowMusicPlayer({ isStandalone: true, isOnline: false }), false);
  assert.equal(helpers.shouldShowMusicPlayer({ isStandalone: false, isOnline: false }), false);
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
      'https://www.philosophyofintelligence.life/trauma-medicine/',
      'https://www.philosophyofintelligence.life/trauma-medicine/trauma.css',
      'https://www.philosophyofintelligence.life/trauma-medicine/app.js',
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

test('index.html exposes Download app icon button without offline HTML download, keeps button visible after install in browser, and removes music in standalone/offline modes', async () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /<link\b[^>]*rel="manifest"[^>]*href="manifest\.webmanifest"/i);
  assert.match(html, /<link\b[^>]*rel="apple-touch-icon"[^>]*href="assets\/apple-touch-icon\.png"/i);
  assert.match(html, /id="download-app-button"[^>]*>[\s\S]*?<svg\b[\s\S]*?<span>Download app<\/span>/i);

  // Issue 1: Verify offline HTML copy button and link are completely removed from install dialog
  const dialogMarkup = html.match(/<dialog id="pwa-install-dialog"[\s\S]*?<\/dialog>/i)[0];
  assert.doesNotMatch(dialogMarkup, /Download offline HTML copy/i);
  assert.doesNotMatch(dialogMarkup, /Philosophy-of-Intelligence-Offline\.html/i);
  assert.doesNotMatch(dialogMarkup, /<a\b/i);
  assert.match(dialogMarkup, /id="pwa-install-confirm"[^>]*>Install app now<\/button>/i);

  const bootstrap = html.match(/<script id="pwa-bootstrap"[^>]*>([\s\S]*?)<\/script>/)[1];

  function createElement(id) {
    const el = new EventTarget();
    el.id = id;
    el.hidden = false;
    el.open = false;
    el.textContent = '';
    el.children = [];
    el.removed = false;
    el.remove = () => { el.removed = true; };
    el.appendChild = child => el.children.push(child);
    el.setAttribute = (k, v) => { if (k === 'open') el.open = true; };
    el.removeAttribute = k => { if (k === 'open') el.open = false; };
    el.showModal = () => { el.open = true; };
    el.close = () => { el.open = false; };
    return el;
  }

  function runBootstrap({ standalone = false, online = true, userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' } = {}) {
    const elements = new Map([
      ['download-app-button', createElement('download-app-button')],
      ['pwa-install-dialog', createElement('pwa-install-dialog')],
      ['pwa-install-close', createElement('pwa-install-close')],
      ['pwa-install-actions', createElement('pwa-install-actions')],
      ['pwa-install-confirm', createElement('pwa-install-confirm')],
      ['pwa-install-steps', createElement('pwa-install-steps')],
      ['pwa-install-lead', createElement('pwa-install-lead')],
      ['offline-indicator', createElement('offline-indicator')],
      ['site-music-panel', createElement('site-music-panel')],
      ['site-song', createElement('site-song')]
    ]);
    elements.get('pwa-install-actions').hidden = true;
    elements.get('pwa-install-confirm').hidden = true;
    elements.get('offline-indicator').hidden = true;

    const bodyClasses = new Set();
    const rootClasses = new Set();
    const win = new EventTarget();
    let swRegistered = null;
    let onlineState = online;
    const nav = {
      userAgent,
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
    win.matchMedia = query => ({
      matches: standalone && query === '(display-mode: standalone)',
      addEventListener() {}
    });

    vm.runInNewContext(bootstrap, {
      window: win,
      navigator: nav,
      location: { protocol: 'https:', hostname: 'www.philosophyofintelligence.life' },
      document: {
        referrer: '',
        getElementById: id => elements.get(id) || null,
        createElement: tag => ({ tag, textContent: '' }),
        documentElement: {
          classList: {
            toggle(name, force) { force ? rootClasses.add(name) : rootClasses.delete(name); },
            add(name) { rootClasses.add(name); }
          }
        },
        body: {
          classList: {
            toggle(name, force) { force ? bodyClasses.add(name) : bodyClasses.delete(name); },
            add(name) { bodyClasses.add(name); }
          }
        }
      }
    });

    return {
      elements,
      bodyClasses,
      rootClasses,
      win,
      setOnline(v) { onlineState = v; },
      get swRegistered() { return swRegistered; }
    };
  }

  // 1. Browser mode (online): Download app visible, music visible, SW registered
  const ctx = runBootstrap({ standalone: false, online: true });
  ctx.win.dispatchEvent(new Event('load'));
  assert.equal(ctx.swRegistered.script, './sw.js');
  assert.equal(ctx.swRegistered.opts.scope, './');
  assert.equal(ctx.elements.get('download-app-button').hidden, false);
  assert.equal(ctx.elements.get('site-music-panel').hidden, false);

  // Clicking Download app without beforeinstallprompt opens iOS guidance dialog and keeps button visible
  ctx.elements.get('download-app-button').dispatchEvent(new Event('click'));
  assert.equal(ctx.elements.get('pwa-install-dialog').open, true);
  assert.equal(ctx.elements.get('download-app-button').hidden, false);
  assert.ok(ctx.elements.get('pwa-install-steps').children.some(li => /Add to Home Screen/i.test(li.textContent)));

  // Close dialog
  ctx.elements.get('pwa-install-close').dispatchEvent(new Event('click'));
  assert.equal(ctx.elements.get('pwa-install-dialog').open, false);

  // Issue 2: Offline hides music panel & toggles offline indicator; returning online restores music panel
  ctx.setOnline(false);
  ctx.win.dispatchEvent(new Event('offline'));
  assert.equal(ctx.elements.get('offline-indicator').hidden, false);
  assert.equal(ctx.elements.get('site-music-panel').hidden, true);
  assert.equal(ctx.bodyClasses.has('pwa-offline'), true);

  ctx.setOnline(true);
  ctx.win.dispatchEvent(new Event('online'));
  assert.equal(ctx.elements.get('offline-indicator').hidden, true);
  assert.equal(ctx.elements.get('site-music-panel').hidden, false);
  assert.equal(ctx.bodyClasses.has('pwa-offline'), false);

  // Issue 1 & 3: Capturing beforeinstallprompt reveals Install app now inside dialog;
  // accepting install AND firing appinstalled in browser keeps Download app button visible!
  let prompted = false;
  const bip = new Event('beforeinstallprompt');
  bip.preventDefault = () => {};
  bip.prompt = async () => { prompted = true; };
  bip.userChoice = Promise.resolve({ outcome: 'accepted' });
  ctx.win.dispatchEvent(bip);
  ctx.elements.get('download-app-button').dispatchEvent(new Event('click'));
  assert.equal(ctx.elements.get('pwa-install-dialog').open, true);
  assert.equal(ctx.elements.get('pwa-install-confirm').hidden, false);
  assert.equal(ctx.elements.get('download-app-button').hidden, false);

  ctx.elements.get('pwa-install-confirm').dispatchEvent(new Event('click'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(prompted, true);
  assert.equal(ctx.elements.get('pwa-install-dialog').open, false);
  assert.equal(ctx.elements.get('download-app-button').hidden, false, 'Download app button must remain visible in browser after install');
  assert.equal(ctx.bodyClasses.has('pwa-standalone'), false, 'Browser tab must not be marked standalone after install');

  ctx.win.dispatchEvent(new Event('appinstalled'));
  assert.equal(ctx.elements.get('download-app-button').hidden, false, 'Download app button must remain visible after appinstalled event');
  assert.equal(ctx.elements.get('site-music-panel').hidden, false, 'Browser music player stays visible in browser tab');

  // Issue 2: Installed standalone PWA hides Download app AND completely removes music player even when online
  const standaloneCtx = runBootstrap({ standalone: true, online: true });
  assert.equal(standaloneCtx.bodyClasses.has('pwa-standalone'), true);
  assert.equal(standaloneCtx.elements.get('download-app-button').hidden, true);
  assert.equal(standaloneCtx.elements.get('site-music-panel').hidden, true);
  assert.equal(standaloneCtx.elements.get('site-song').removed, true);

  // Verify site-song-loader never mounts the Suno iframe in standalone mode or offline mode
  const songLoader = html.match(/<script id="site-song-loader">([\s\S]*?)<\/script>/)[1];
  for (const scenario of [
    { name: 'standalone online', standalone: true, onLine: true },
    { name: 'browser offline', standalone: false, onLine: false }
  ]) {
    let mounted = false;
    const detailsEl = { hidden: false };
    const panel = new EventTarget();
    panel.removeAttribute = () => {};
    panel.closest = () => detailsEl;
    const slot = {
      isConnected: true,
      parentElement: panel,
      content: { querySelector: () => ({}) },
      replaceWith() { mounted = true; }
    };
    const loaderWin = new EventTarget();
    loaderWin.matchMedia = q => ({ matches: scenario.standalone && q === '(display-mode: standalone)' });
    vm.runInNewContext(songLoader, {
      document: { referrer: '', getElementById: () => slot },
      window: loaderWin,
      navigator: { onLine: scenario.onLine, standalone: false }
    });
    assert.equal(mounted, false, `site-song-loader must not mount Suno iframe when ${scenario.name}`);
    assert.equal(detailsEl.hidden, true, `site-music-panel must be hidden when ${scenario.name}`);
  }
});
