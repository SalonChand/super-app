// SuperApp Service Worker - Push Notifications
self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(clients.claim());
});

self.addEventListener('push', (e) => {
    let data = { title: 'SuperApp', body: 'You have a new notification', icon: '/favicon.ico' };
    try { data = e.data ? e.data.json() : data; } catch(err) {}

    e.waitUntil(
        self.registration.showNotification(data.title || 'SuperApp', {
            body: data.body || '',
            icon: data.icon || '/favicon.ico',
            badge: '/favicon.ico',
            vibrate: [200, 100, 200],
            data: { url: data.url || '/' },
            actions: [{ action: 'open', title: 'Open App' }]
        })
    );
});

self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    const url = e.notification.data?.url || '/';
    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});
