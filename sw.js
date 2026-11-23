'use strict';

const CACHE_NAME = 'poi-app-v2';

// Explicit allowlist of Philosophy of Intelligence application assets ONLY.
// /common-earth is strictly excluded from caching and service worker control.
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/styles.css',
  '/icon.svg',
  '/src/landing.css',
  '/src/training.css',
  '/src/psiduction.css',
  '/src/agency-map.css',
  '/src/relational-models.js',
  '/src/model-view.js',
  '/src/progress.js',
  '/src/geometry.js',
  '/src/shape-practice.js',
  '/src/exercises.js',
  '/src/training-store.js',
  '/src/agency-practice.js',
  '/src/agency-map.js',
  '/src/training.js',
  '/src/app.js',
  '/src/pwa-helpers.js',
  '/assets/intelligence-portals.webp',
  '/assets/etched-eye.webp',
  '/assets/archive-ring.webp',
  '/assets/parchment-texture.svg',
  '/assets/universe-tattoo.svg',
  '/assets/wave-chair-basic.svg',
  '/assets/wave-chair-a.svg',
  '/assets/wave-chair-b.svg',
  '/assets/wave-chair-c.svg',
  '/assets/wave-chair-d.svg',
  '/assets/pwa-192x192.png',
  '/assets/pwa-512x512.png',
  '/assets/pwa-maskable-512x512.png',
  '/assets/apple-touch-icon.png'
];

function isExcludedPath(pathname) {
  return (
    /^\/(?:common-earth|zelda-and-the-princess-zombie)(?:\/|$)/i.test(pathname) ||
    /^\/dist(?:\/|$)/i.test(pathname) ||
    /^\/(?:server\.js|package(?:-lock)?\.json|metadata\.json)$/i.test(pathname)
  );
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME && key.startsWith('poi-app-'))
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isExcludedPath(url.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          caches
            .match(request, { ignoreSearch: true })
            .then(cached => cached || caches.match('/index.html'))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(cached => {
      const networkFetch = fetch(request)
        .then(response => {
          if (response && response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(url.pathname, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
