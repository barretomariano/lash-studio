const CACHE = "lash-studio-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/static/js/main.chunk.js",
  "/static/js/bundle.js",
  "/static/css/main.chunk.css",
  "/manifest.json",
];

// Instalar: cachear assets principales
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll(ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activar: limpiar caches viejas
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first para API, cache-first para assets estáticos
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // No interceptar Firebase ni APIs externas
  if (
    url.hostname.includes("firebase") ||
    url.hostname.includes("googleapis") ||
    url.hostname.includes("fonts.g") ||
    url.hostname.includes("wa.me") ||
    url.hostname.includes("maps.google") ||
    url.hostname.includes("instagram.com")
  ) {
    return;
  }

  // Assets estáticos: cache-first
  if (
    e.request.destination === "script" ||
    e.request.destination === "style" ||
    e.request.destination === "image" ||
    e.request.destination === "font"
  ) {
    e.respondWith(
      caches.match(e.request).then(
        (cached) => cached || fetch(e.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
          return res;
        })
      )
    );
    return;
  }

  // Navegación: network-first, fallback a index.html para SPA
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match("/index.html")
      )
    );
    return;
  }

  // Default: network con fallback a cache
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
