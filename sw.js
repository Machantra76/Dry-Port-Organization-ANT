self.addEventListener('install', (e) => {
    console.log('[Service Worker] Installed');
});
self.addEventListener('fetch', (e) => {
    // សម្រាប់ការទាញយកទិន្នន័យពី Server ធម្មតា
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});