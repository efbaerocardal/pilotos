const CACHE_NAME = 'aerocardal-pwa-v3';

// Imprescindible: si falla, la instalación falla (así no queda una app "offline" rota)
const CRITICAL = ['./index.html'];

// Deseable: si alguno falla (ej. un ícono ausente) no se cancela la instalación
const OPTIONAL = [
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CRITICAL);
    const results = await Promise.allSettled(OPTIONAL.map((url) => cache.add(url)));
    results.forEach((r, i) => {
      if (r.status === 'rejected') console.warn('No se pudo cachear:', OPTIONAL[i]);
    });
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
    ))
  );
  self.clients.claim();
});

// Stale-while-revalidate: responde al instante desde la caché y actualiza en segundo plano
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.url.includes('googleapis.com') || req.url.includes('accounts.google.com')) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req, { ignoreSearch: true });

    const network = fetch(req)
      .then((res) => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      })
      .catch(() => null);

    if (cached) {
      event.waitUntil(network);
      return cached;
    }

    const res = await network;
    if (res) return res;

    if (req.mode === 'navigate') {
      const fallback = await cache.match('./index.html');
      if (fallback) return fallback;
    }
    return new Response('Sin conexión', { status: 503, statusText: 'Offline' });
  })());
});
