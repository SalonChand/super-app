// This file runs in the background of the phone to make it feel like a real app!
self.addEventListener('install', (event) => {
    console.log('App Installed Successfully');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('App Activated');
});

self.addEventListener('fetch', (event) => {
    // Just having this fetch listener satisfies Chrome's strict App Install requirements!
});