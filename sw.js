/* Alone Among the Stars — service worker.
   App shell is precached; cross-origin CDN + font assets are cached at runtime,
   so after the first online visit the app works fully offline. */
const VERSION = 'aats-v14';
const SHELL = [
  './',
  './index.html',
  './app.js',
  './planet-renderer.js',
  './vendor/react.production.min.js',
  './vendor/react-dom.production.min.js',
  './manifest.webmanifest',
  './icons/icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Navigations: serve the cached app shell first (instant + offline), refresh in background.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cached) => {
        const network = fetch(request)
          .then((res) => {
            caches.open(VERSION).then((c) => c.put('./index.html', res.clone()));
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Everything else (app assets + CDN scripts + fonts): cache-first, then network.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((res) => {
          // Cache successful or opaque (cross-origin no-cors) responses for next time.
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
