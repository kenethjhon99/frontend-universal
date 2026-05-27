// Service Worker para POS SaaS.
// Estrategias:
//   - assets estaticos (JS/CSS) -> stale-while-revalidate
//   - HTML del shell -> network-first con fallback a cache
//   - GET /api/saas/* idempotentes (catalogos) -> stale-while-revalidate corto
//   - POST a /api/saas/ventas cuando offline -> Background Sync (cola IndexedDB)

const SW_VERSION = "v1.0.0";
const STATIC_CACHE = `saas-static-${SW_VERSION}`;
const RUNTIME_CACHE = `saas-runtime-${SW_VERSION}`;
const API_CACHE = `saas-api-${SW_VERSION}`;
const OFFLINE_HTML = "/saas-offline.html";

const PRECACHE_URLS = [
  "/saas.html",
  OFFLINE_HTML,
  "/saas-manifest.webmanifest",
];

// ----- Install -----
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn("[sw] precache fallo parcial:", err);
      })
    )
  );
  self.skipWaiting();
});

// ----- Activate: limpia caches viejos -----
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(
            (k) =>
              k.startsWith("saas-") &&
              ![STATIC_CACHE, RUNTIME_CACHE, API_CACHE].includes(k)
          )
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ----- Helpers -----
const isApiCacheable = (url) => {
  if (!url.pathname.startsWith("/api/saas/")) return false;
  // Solo GETs de catalogos seguros para cachear
  const cacheable = [
    "/comprobantes/tipos",
    "/empresas/me",
    "/sucursales",
    "/usuarios/catalogo/roles",
    "/servicios/catalogo",
    "/servicios/tipos-vehiculo",
    "/productos",
  ];
  return cacheable.some((p) => url.pathname.endsWith(p) || url.pathname.includes(p));
};

const isStaticAsset = (url) =>
  /\.(js|css|woff2?|svg|png|jpg|jpeg|gif|webp)$/i.test(url.pathname);

// ----- Fetch -----
self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    // POST/PUT/DELETE: no cachear. Si es venta y hay sync, lo maneja el cliente.
    return;
  }

  const url = new URL(request.url);

  // Solo cachea same-origin
  if (url.origin !== self.location.origin) return;

  // HTML del shell -> network-first
  if (request.mode === "navigate") {
    event.respondWith(networkFirstHtml(request));
    return;
  }

  // Assets estaticos -> stale-while-revalidate
  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  // API GETs cacheables -> stale-while-revalidate con TTL corto
  if (isApiCacheable(url)) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE, 60 * 1000));
    return;
  }
});

const networkFirstHtml = async (request) => {
  try {
    const network = await fetch(request);
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, network.clone());
    return network;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match(OFFLINE_HTML);
  }
};

const staleWhileRevalidate = async (request, cacheName, maxAgeMs = null) => {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchAndCache = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    // Validacion de TTL si maxAge fue dado
    if (maxAgeMs) {
      const dateHeader = cached.headers.get("date");
      if (dateHeader) {
        const age = Date.now() - new Date(dateHeader).getTime();
        if (age > maxAgeMs) {
          // Vencido: prefiere network si esta disponible
          const fresh = await fetchAndCache;
          return fresh || cached;
        }
      }
    }
    // No esperar a la red; ya disparada en background
    fetchAndCache.catch(() => {});
    return cached;
  }

  // Sin cache: espera a la red
  const network = await fetchAndCache;
  if (network) return network;
  // Sin red ni cache
  return new Response(
    JSON.stringify({ error: "offline", cached: false }),
    { status: 503, headers: { "content-type": "application/json" } }
  );
};

// ----- Mensajes desde la app -----
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
