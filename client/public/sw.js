// ============================================================
//  Connect Service Worker — Push + Offline Fallback
// ============================================================

const CACHE_NAME = 'connect-shell-v1';
const OFFLINE_URL = '/offline.html';

// ── Install: cache the app shell ──────────────────────────────
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            cache.addAll(['/', '/logo.png'])
                .catch(() => {}) // don't fail install if network is down
        ).then(() => self.skipWaiting())
    );
});

// ── Activate: clean old caches ────────────────────────────────
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

// ── Force update ──────────────────────────────────────────────
self.addEventListener('message', (e) => {
    if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// ── Fetch: network-first, offline fallback ────────────────────
self.addEventListener('fetch', (e) => {
    // Only handle GET requests
    if (e.request.method !== 'GET') return;

    const url = new URL(e.request.url);

    // Skip API calls and external requests — always live
    if (url.origin !== self.location.origin) return;
    if (url.pathname.startsWith('/api/')) return;

    e.respondWith(
        fetch(e.request)
            .then(res => {
                // Cache static assets (logo, icons)
                if (url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webp)$/)) {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
                }
                return res;
            })
            .catch(async () => {
                // Offline: try cache first
                const cached = await caches.match(e.request);
                if (cached) return cached;
                // For navigation requests, return cached root
                if (e.request.mode === 'navigate') {
                    const root = await caches.match('/');
                    return root || new Response('Connect is offline. Please check your internet connection.', {
                        status: 503,
                        headers: { 'Content-Type': 'text/plain' }
                    });
                }
            })
    );
});

// ── Push Notifications ────────────────────────────────────────
self.addEventListener('push', (e) => {
    if (!e.data) return;

    let data;
    try { data = e.data.json(); } catch { data = { title: 'Connect', body: e.data.text() }; }

    const {
        title  = 'Connect',
        body   = 'You have a new notification',
        icon   = '/logo.png',
        badge  = '/logo.png',
        url    = '/',
        tag    = 'connect-notif',
        type   = 'general',
    } = data;

    const typeIcons = {
        message:         '💬',
        like:            '❤️',
        comment:         '🗨️',
        friend_request:  '👥',
        friend_accepted: '🤝',
        mention:         '@ ',
        streak:          '🔥',
        verified:        '✅',
        broadcast:       '📢',
        community:       '🌐',
        marketplace:     '🛍️',
        challenge:       '🎯',
    };
    const prefix = typeIcons[type] || '🔔';

    const options = {
        body,
        icon,
        badge,
        tag,
        renotify: true,
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
    let targetUrl = url;
    if (e.action === 'reply')  targetUrl = '/chat';
    if (e.action === 'view')   targetUrl = '/friends';
    if (e.action === 'snap')   targetUrl = '/streaks';

    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            for (const client of windowClients) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus();
                    client.navigate(targetUrl);
                    return;
                }
            }
            if (clients.openWindow) return clients.openWindow(targetUrl);
        })
    );
});

self.addEventListener('notificationclose', () => {});
