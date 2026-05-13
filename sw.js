// Health Hub Service Worker — Offline Cache + Push Notifications
const CACHE_NAME = 'health-hub-v2026.05.13-rest-alerts';
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


// In-app scheduled notifications for short timers (rest/stretch/cardio).
// This is intentionally redundant with page timers because mobile browsers throttle aggressively.
const scheduledNotifications = new Map();
const showAppNotification = (payload = {}) => {
    const title = payload.title || 'Health Hub';
    const options = {
          body: payload.body || '',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: payload.tag || 'health-hub',
          data: { url: payload.url || '/', tab: payload.tab || null },
          vibrate: payload.vibrate || [200, 100, 200, 100, 200],
          renotify: payload.renotify !== false,
          requireInteraction: payload.requireInteraction !== false,
    };
    return self.registration.showNotification(title, options);
};

self.addEventListener('message', (event) => {
    const msg = event.data || {};
    if (msg.type === 'SKIP_WAITING') {
          self.skipWaiting();
          return;
    }
    if (msg.type === 'SHOW_NOTIFICATION') {
          event.waitUntil(showAppNotification(msg.payload || {}));
          return;
    }
    if (msg.type === 'SCHEDULE_NOTIFICATION') {
          const payload = msg.payload || {};
          const tag = payload.tag || `health-hub-${Date.now()}`;
          const fireAt = Number(msg.fireAt || payload.fireAt || 0);
          const delayMs = Math.max(0, fireAt - Date.now());
          if (scheduledNotifications.has(tag)) clearTimeout(scheduledNotifications.get(tag));
          const timeoutId = setTimeout(() => {
                scheduledNotifications.delete(tag);
                showAppNotification({ ...payload, tag }).catch(() => {});
          }, delayMs);
          scheduledNotifications.set(tag, timeoutId);
          return;
    }
    if (msg.type === 'CANCEL_NOTIFICATION') {
          const tag = msg.tag;
          if (tag && scheduledNotifications.has(tag)) {
                clearTimeout(scheduledNotifications.get(tag));
                scheduledNotifications.delete(tag);
          }
    }
});

// Push notifications
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    event.waitUntil(showAppNotification(data));
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
