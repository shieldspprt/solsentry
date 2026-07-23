const CACHE_NAME = 'solsentry-cache-v3.0.0';
const IMMUTABLE_PRECACHE = ['/manifest.json'];

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: 'SolSentry Alert', body: event.data ? event.data.text() : 'Position risk update' };
  }

  const title = payload.title || 'SolSentry Risk Alert';
  const options = {
    body: payload.body || 'A monitored position needs attention.',
    icon: '/manifest.json',
    badge: '/manifest.json',
    tag: payload.tag || 'solsentry-risk',
    requireInteraction: payload.severity === 'critical',
    data: { url: payload.url || '/dashboard/positions' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  let target = (event.notification.data && event.notification.data.url) || '/dashboard/positions';
  try {
    const parsed = new URL(target, self.location.origin);
    if (parsed.origin !== self.location.origin || !target.startsWith('/')) {
      target = '/dashboard/positions';
    }
  } catch {
    target = '/dashboard/positions';
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(target));
      if (existing) return existing.focus();
      return self.clients.openWindow(target);
    })
  );
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(IMMUTABLE_PRECACHE))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Don't cache cross-origin requests
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/') || event.request.headers.get('authorization')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const cacheControl = networkResponse.headers.get('cache-control') || '';
        if (cacheControl.includes('no-store') || cacheControl.includes('private')) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;
        return caches.match('/manifest.json');
      })
  );
});
