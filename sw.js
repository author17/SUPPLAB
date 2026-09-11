// SUPPLAB service worker
// Strategy: network-first for the page itself (so shoppers always see fresh
// deals/prices when online), with an automatic offline fallback to whatever
// was last successfully loaded. Static assets (manifest, icons) are
// cache-first. Nothing here hardcodes the site's HTML filename, so it keeps
// working no matter what the live page is actually called.

const CACHE_VERSION = 'supplab-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const STATIC_ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch((err) => console.warn('SUPPLAB SW: precache skipped', err))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const isNavigation =
    request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept') && request.headers.get('accept').includes('text/html'));

  if (isNavigation) {
    // Network-first: try live page, cache a copy for offline, fall back to
    // the cached copy (or the last-cached page as a generic fallback).
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            if (cached) return cached;
            return caches.open(RUNTIME_CACHE).then((cache) =>
              cache.keys().then((keys) => {
                const pageKey = keys.find((k) => k.url.indexOf('#') === -1);
                return pageKey ? cache.match(pageKey) : Response.error();
              })
            );
          })
        )
    );
    return;
  }

  // Everything else: cache-first, network as a fallback, and quietly cache
  // whatever new asset comes back.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
