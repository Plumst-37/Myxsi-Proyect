const CACHE_NAME = 'myxsi-cache-v25';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/chat.html',
  '/academy.html',
  '/canva.html',
  '/docs.html',
  '/files.html',
  '/registro.html',
  '/politicas.html',
  '/recuperacion.html',
  '/CSS/chat.css',
  '/CSS/index.css',
  '/CSS/login.css',
  '/CSS/registro.css',
  '/CSS/recuperacion.css',
  '/js/chat.js',
  '/js/academy.js',
  '/assets/favicon-48x48.png',
  '/assets/apple-touch-icon.png',
  '/assets/logo.png',
  '/assets/seo-banner.png',
  '/manifest.json',
  '/favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Ignorar peticiones de API dinámicas y autenticación
  if (event.request.method !== 'GET' || 
      event.request.url.includes('workers.dev') || 
      event.request.url.includes('googleapis.com') || 
      event.request.url.includes('identitytoolkit') || 
      event.request.url.includes('firestore') ||
      event.request.url.includes('firebase')) {
    return;
  }

  // Estrategia Network-First para páginas HTML (Navegación principal)
  if (event.request.mode === 'navigate' || (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      }).catch(() => {
        return caches.match(event.request).then((cached) => cached || caches.match('/chat.html') || caches.match('/index.html'));
      })
    );
    return;
  }

  // Estrategia Stale-While-Revalidate para activos estáticos (CSS, JS, imágenes, fuentes)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        if (response && response.status === 200 && (
            event.request.url.includes('fonts.googleapis.com') ||
            event.request.url.includes('cdnjs.cloudflare.com') ||
            event.request.url.includes('cdn.jsdelivr.net')
        )) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return response;
      });
    }).catch(() => fetch(event.request))
  );
});
