const CACHE_STATIC = 'voll-hub-static-v2';
const CACHE_API = 'voll-hub-api-v1';
const STATIC_ASSETS = ['/', '/index.html'];

const SUPABASE_ORIGIN = 'https://bofbhfsvxfqolpvdtvfz.supabase.co';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_STATIC).then((c) => c.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_STATIC && k !== CACHE_API).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // App shell: same origin (HTML, JS, CSS, etc.)
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          if (res.status === 200 && (request.destination === 'document' || request.destination === 'script' || request.destination === 'style' || request.destination === '')) {
            caches.open(CACHE_STATIC).then((c) => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  // Supabase REST API: cache GET responses for offline
  if (url.origin === SUPABASE_ORIGIN && url.pathname.includes('/rest/v1/')) {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          if (res.status === 200) {
            caches.open(CACHE_API).then((c) => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Other GET (e.g. images): try network, fallback cache
  e.respondWith(
    fetch(request)
      .then((res) => {
        const clone = res.clone();
        if (res.status === 200) caches.open(CACHE_STATIC).then((c) => c.put(request, clone));
        return res;
      })
      .catch(() => caches.match(request))
  );
});
