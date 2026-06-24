// ChatMe Service Worker — handles background push notifications
const CACHE_NAME = 'chatme-v1';
const STATIC_ASSETS = ['/', '/index.html'];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Push: display notification from server push event
self.addEventListener('push', (event) => {
  let data = { title: 'ChatMe', body: 'You have a new message!', icon: '/chatmeappicon.png' };
  if (event.data) {
    try { data = { ...data, ...event.data.json() }; } catch {}
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/chatmeappicon.png',
      badge: '/favicon.svg',
      tag: 'chatme-message',
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' }
    })
  );
});

// Notification click: focus the app window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return self.clients.openWindow(targetUrl);
    })
  );
});

// Message: allow app to trigger notifications directly
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, tag } = event.data;
    self.registration.showNotification(title || 'ChatMe', {
      body: body || 'New message',
      icon: icon || '/chatmeappicon.png',
      badge: '/favicon.svg',
      tag: tag || 'chatme-message',
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: '/' }
    });
  }
});
