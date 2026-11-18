// Service worker: la app funciona sin conexión desde la primera visita.
// GENERADO en cada `vite build` (plugin en vite.config.ts): la versión y la lista de archivos
// se rellenan con los del build.
const VERSION = '__VERSION__';
const CACHE = `ajedrez-${VERSION}`; // la app de esta versión (se borra al publicar otra)
const STATIC = 'ajedrez-static-v1'; // Stockfish y fuentes: no cambian, no se vuelven a bajar
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== STATIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (/\/(stockfish|fonts)\//.test(url.pathname)) return e.respondWith(cacheFirst(req, STATIC));
  if (url.pathname.includes('/assets/')) return e.respondWith(cacheFirst(req, CACHE)); // llevan hash: no cambian
  if (req.mode === 'navigate') return e.respondWith(pageWithTimeout(req));
  e.respondWith(staleWhileRevalidate(req));
});

// ignoreVary: los módulos y fuentes se piden con cabecera Origin y el servidor responde con
// «Vary»; sin esto, lo guardado al instalar (pedido sin Origin) no se encontraría sin conexión.
const MATCH = { ignoreVary: true, ignoreSearch: true };

/** Lo guardado primero (en cualquier caché); si no está, de la red (y se guarda en `name`). */
async function cacheFirst(req, name) {
  const hit = await caches.match(req, MATCH);
  if (hit) return hit;
  const cache = await caches.open(name);
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

/** La página: de la red si contesta en 2,5 s (para tener la última versión); si no, la guardada. */
async function pageWithTimeout(req) {
  const cache = await caches.open(CACHE);
  const network = fetch(req).then((res) => {
    if (res.ok) cache.put('./', res.clone());
    return res;
  });
  const slow = new Promise((resolve) => setTimeout(resolve, 2500, null));
  const fast = await Promise.race([network.catch(() => null), slow]);
  if (fast) return fast;
  const saved = await cache.match('./', MATCH);
  return saved || network;
}

/** Lo guardado al momento y, de paso, se actualiza desde la red para la próxima vez. */
async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req, MATCH);
  const network = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit || network;
}
