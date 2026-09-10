/* Service worker — Viáticos M Dreieck
   Mantiene la app instalable y disponible sin internet, PERO siempre
   trae la última versión cuando hay conexión (estrategia network-first).
   Los envíos a la nube (POST al Apps Script) NO se tocan: pasan directo. */

const CACHE = 'mdviaticos-v2';   /* sube este número en cada cambio grande */
const ASSETS = [
  'index.html',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png'
];

/* Instalar: guardar los archivos base y activar de inmediato */
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () { return self.skipWaiting(); })
  );
});

/* Activar: borrar cachés viejos y tomar control */
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* Fetch: NETWORK-FIRST.
   Intenta la red primero (versión nueva). Si hay internet, la usa y
   actualiza el caché. Si no hay, cae al caché guardado. */
self.addEventListener('fetch', function (e) {
  var req = e.request;

  /* Solo GET del mismo origen. Los POST (envíos a la nube) pasan intactos. */
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req).then(function (resp) {
      /* Llegó de internet: guardar copia fresca y devolverla */
      var copy = resp.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
      return resp;
    }).catch(function () {
      /* Sin internet: usar lo guardado; si es navegación, el index */
      return caches.match(req).then(function (r) {
        return r || caches.match('index.html');
      });
    })
  );
});
