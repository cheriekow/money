const CACHE_NAME = 'gulu-money-v1';
const STATIC_ASSETS = [
  './',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './manifest.json'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('SW caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('SW removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Navigation requests (HTML pages) -> Network first, do not cache HTML pages
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => {
        // Fallback: If network fails completely, try to serve '/' from cache
        return caches.match('/');
      })
    );
    return;
  }

  // 2. Static assets (JS, CSS, images, fonts, icons) -> Cache first
  const isStaticAsset = 
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|otf|json)$/) ||
    url.pathname === '/' ||
    url.pathname.endsWith('/money/');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(req).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise fetch, cache, and return
        return fetch(req).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(req, cacheCopy);
            });
          }
          return networkResponse;
        }).catch(() => {
          // If fetch fails, return nothing
        });
      })
    );
    return;
  }

  // 3. Other requests (API requests, etc.) -> Network only
  event.respondWith(fetch(req));
});
