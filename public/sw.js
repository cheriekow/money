const CACHE_NAME = 'gulu-cache-v2';
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

  // 1. Only cache GET requests
  if (req.method !== 'GET') {
    event.respondWith(fetch(req));
    return;
  }

  // 2. Only cache http and https schemes (ignore chrome-extension://, data:, etc)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    event.respondWith(fetch(req));
    return;
  }

  // 3. Prefer only caching same-origin app assets
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(req));
    return;
  }

  // 4. Do not cache API requests or Supabase
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase.co')) {
    event.respondWith(fetch(req));
    return;
  }

  // Navigation requests (HTML pages) -> Network first
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => {
        return caches.match('/');
      })
    );
    return;
  }

  // Static assets -> Cache first, fallback to network
  event.respondWith(
    caches.match(req).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(req).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(req, cacheCopy);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fetch failed, do nothing
      });
    })
  );
});
