const CACHE_NAME = 'cargo-app-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/cargo-gate.html',
  '/manifest.json'
];

// ពេល Install Service Worker
self.addEventListener('install', (e) => {
    console.log('[Service Worker] Installed');
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache).catch(err => console.log('Cache add failed:', err));
        })
    );
});

// ពេល Activate Service Worker (លុប Cache ចាស់ៗចោល)
self.addEventListener('activate', (e) => {
    console.log('[Service Worker] Activated');
    e.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// ពេល Fetch យកទិន្នន័យ
self.addEventListener('fetch', (e) => {
    e.respondWith(
        fetch(e.request)
            .catch(() => {
                return caches.match(e.request).then((response) => {
                    return response || caches.match('/index.html');
                });
            })
    );
});


