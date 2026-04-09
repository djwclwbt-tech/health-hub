// Health Hub Service Worker — Offline Cache + Push Notifications
const CACHE_NAME = 'health-hub-v2026.04.09';
const PRECACHE_URLS = ['/', '/index.html', '/icon-192.png', '/icon-512.png', '/manifest.json'];

// Pre-cache essential files on install
self.addEventListener('install', (event) => {
    event.waitUntil(
          caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
        );
    self.skipWaiting();
});

// Clean up old caches on activate
self.addEventListener('activate', (event) => {
    event.waitUntil(
          caches.keys().then((keys) =>
                  Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
                                 ).then(() => clients.claim())
        );
});

// Network-first for navigation, cache the response for offline fallback
self.addEventListener('fetch', (event) => {
    if (event.request.mode === 'navigate') {
          event.respondWith(
                  fetch(event.request)
                    .then((response) => {
                                const clone = response.clone();
                                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                                return response;
                    })
                    .catch(() => caches.match(event.request) || caches.match('/index.html'))
                );
          return;
    }
});

// Push notifications
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Health Hub';
    const options = {
          body: data.body || '',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: data.tag || 'default',
          data: { url: data.url || '/', tab: data.tab || null },
          vibrate: [200, 100, 200],
          requireInteraction: data.requireInteraction || false,
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/';
    event.waitUntil(
          clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
                  for (const client of windowClients) {
                            if (client.url.includes(self.location.origin) && 'focus' in client) {
                                        return client.focus();
                            }
                  }
                  return clients.openWindow(url);
          })
        );
});
