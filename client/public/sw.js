// ============================================================
//  SuperApp Service Worker — Push Notifications + PWA Cache
// ============================================================

const CACHE_NAME = 'superapp-v1';
const STATIC_ASSETS = ['/', '/index.html', '/logo.png'];

// ── Install ──────────────────────────────────────────────────
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
    );
    self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// ── Fetch (basic cache-first for static, network-first for API) ──
self.addEventListener('fetch', (e) => {
    if (e.request.url.includes('/api/')) return; // never cache API calls
    e.respondWith(
        caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => cached))
    );
});

// ── Push Notification Handler ─────────────────────────────────
self.addEventListener('push', (e) => {
    if (!e.data) return;

    let data;
    try { data = e.data.json(); } catch { data = { title: 'SuperApp', body: e.data.text() }; }

    const {
        title  = 'SuperApp',
        body   = 'You have a new notification',
        icon   = '/logo.png',
        badge  = '/logo.png',
        url    = '/',
        tag    = 'superapp-notif',
        type   = 'general',
    } = data;

    // Pick emoji prefix by type
    const typeIcons = {
        message:         '💬',
        like:            '❤️',
        comment:         '🗨️',
        friend_request:  '👥',
        friend_accepted: '🤝',
        mention:         '@️',
        streak:          '🔥',
        verified:        '✅',
        broadcast:       '📢',
        community:       '🌐',
        marketplace:     '🛍️',
    };
    const prefix = typeIcons[type] || '🔔';

    const options = {
        body,
        icon,
        badge,
        tag,                    // same tag = replace previous notif of same type
        renotify: true,         // vibrate even if replacing
        requireInteraction: type === 'message' || type === 'friend_request',
        vibrate: [100, 50, 100],
        data: { url },
        actions: getActions(type),
    };

    e.waitUntil(
        self.registration.showNotification(`${prefix} ${title}`, options)
    );
});

function getActions(type) {
    if (type === 'message')        return [{ action: 'reply', title: '💬 Open Chat' }];
    if (type === 'friend_request') return [{ action: 'view',  title: '👀 View Request' }];
    if (type === 'streak')         return [{ action: 'snap',  title: '🔥 Send Snap' }];
    return [];
}

// ── Notification Click ────────────────────────────────────────
self.addEventListener('notificationclick', (e) => {
    e.notification.close();

    const url = e.notification.data?.url || '/';

    // Map action clicks to specific URLs
    let targetUrl = url;
    if (e.action === 'reply')  targetUrl = '/chat';
    if (e.action === 'view')   targetUrl = '/friends';
    if (e.action === 'snap')   targetUrl = '/streaks';

    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            // If app is already open, focus it and navigate
            for (const client of windowClients) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus();
                    client.navigate(targetUrl);
                    return;
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) return clients.openWindow(targetUrl);
        })
    );
});

// ── Notification Close (optional analytics) ──────────────────
self.addEventListener('notificationclose', () => {});
