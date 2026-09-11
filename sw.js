// SUPPLAB service worker
// Strategy: stale-while-revalidate for the page itself (this is a large,
// fully self-contained page, so showing the last cached copy instantly and
// quietly re-fetching a fresh one in the background keeps the installed app
// opening fast instead of waiting on a multi-MB download every launch; the
// refreshed copy is ready by the *next* open). Static assets (manifest,
// icons) are cache-first. Nothing here hardcodes the site's HTML filename,
// so it keeps working no matter what the live page is actually called.

const CACHE_VERSION = 'supplab-v4';
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
    // Stale-while-revalidate: answer instantly from cache when we have a
    // copy (fast app launch), and always kick off a fresh network fetch in
    // parallel to update the cache for the next open. Only actually wait on
    // the network when there's nothing cached yet (first-ever visit).
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => null);

        if (cached) {
          // Don't block the response on it, but don't let it go unhandled either.
          networkFetch.catch(() => {});
          return cached;
        }

        return networkFetch.then((response) => {
          if (response) return response;
          return caches.open(RUNTIME_CACHE).then((cache) =>
            cache.keys().then((keys) => {
              const pageKey = keys.find((k) => k.url.indexOf('#') === -1);
              return pageKey ? cache.match(pageKey) : Response.error();
            })
          );
        });
      })
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
