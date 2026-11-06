const CACHE_NAME = 'aerocardal-pwa-v1';
const ASSETS_TO_CACHE = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // Cacheamos la librería externa para que funcione el PDF offline
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

// 1. Instalación: Guarda los archivos en caché
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Activación: Limpia cachés antiguos si actualizas la versión
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
    })
  );
  self.clients.claim();
});

// 3. Intercepción: Cache-First (Busca en caché, si no está, va a la red)
self.addEventListener('fetch', (event) => {
  // Ignoramos las peticiones a la API de Google Drive para evitar conflictos de caché
  if (event.request.url.includes('googleapis.com') || event.request.url.includes('accounts.google.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Si está en caché (offline), lo entrega. Si no, va a internet.
      return cachedResponse || fetch(event.request);
    }).catch(() => {
      // Opcional: Fallback si algo falla estando offline
      console.log('Fallo en la red y recurso no cacheado:', event.request.url);
    })
  );
});