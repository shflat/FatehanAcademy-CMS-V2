// Dynamically versioned on server response via __SW_CACHE_VERSION__
const CACHE_NAME = 'skill98-static-__SW_CACHE_VERSION__';

// Only immutable static icons/manifest — NEVER cache '/', 'index.html', '/api/*', or '/admin*'
const STATIC_SHELL_ASSETS = [
  '/manifest.webmanifest',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png',
  '/logo-skill98.svg',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_SHELL_ASSETS).catch(() => undefined))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // STRICT NETWORK-ONLY: Never cache API routes, Admin routes, Service Worker, protected downloads, or HTML documents
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/uploads/_protected_downloads') ||
    url.pathname === '/sw.js' ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html') ||
    req.mode === 'navigate'
  ) {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(
        () =>
          new Response('عدم دسترسی موقت به سرور. لطفاً اتصال اینترنت را بررسی و صفحه را بازآوری کنید.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
          })
      )
    );
    return;
  }

  // Immutable hashed bundles (/assets/*) and self-hosted fonts (/fonts/*): Cache-First
  const isImmutableAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname.startsWith('/badges/') ||
    STATIC_SHELL_ASSETS.includes(url.pathname);

  if (isImmutableAsset) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
          }
          return res;
        });
      })
    );
    return;
  }

  // All other requests (e.g. uploaded images / dynamic media): Network-First with cache fallback
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic' && url.pathname.startsWith('/uploads/')) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});

self.addEventListener('push', (event) => {
  let payload = {
    title: 'اسکیل ۹۸',
    body: 'پیام جدیدی از سامانه دریافت کردید.',
    url: '/',
    icon: '/pwa-192x192.png',
  };
  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch {
    if (event.data) payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      dir: 'rtl',
      lang: 'fa',
      data: { url: payload.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(targetUrl).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
