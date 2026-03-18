// ============================================================
//  SuperApp Service Worker — Push Notifications (no caching)
//  No static caching = always loads fresh code on every deploy
// ============================================================

// ── Install & Activate: skip waiting, claim clients immediately ──
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
    // Clear ALL old caches on every deploy
    e.waitUntil(
        caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
        .then(() => self.clients.claim())
    );
});

// ── Force update when main.jsx sends SKIP_WAITING ────────────
self.addEventListener('message', (e) => {
    if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});


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

// ── Push Subscription Change (auto-renew when subscription expires) ──────
// Fired by the browser when the push subscription is changed or expires.
// We resubscribe and push the new subscription to the backend so push
// notifications keep working even while the app is closed.
self.addEventListener('pushsubscriptionchange', (e) => {
    const BACKEND_URL = 'https://superapp-backend-6106.onrender.com';

    e.waitUntil(
        (async () => {
            try {
                // Fetch the VAPID public key
                const vapidRes = await fetch(`${BACKEND_URL}/api/vapidPublicKey`);
                if (!vapidRes.ok) throw new Error('Failed to fetch VAPID key');
                const vapidKey = await vapidRes.text();

                // Resubscribe with the current VAPID key
                const newSubscription = await self.registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidKey),
                });

                // Tell the backend to swap the old subscription for the new one
                await fetch(`${BACKEND_URL}/api/resubscribe`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        oldEndpoint: e.oldSubscription?.endpoint,
                        newSubscription: newSubscription.toJSON(),
                    }),
                });
            } catch (err) {
                console.error('[SW] pushsubscriptionchange failed:', err);
            }
        })()
    );
});

// ── Helper: convert URL-safe base64 VAPID key to Uint8Array ──────────────
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
