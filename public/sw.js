const CACHE = "lash-studio-v3";
const ASSETS = ["/", "/index.html", "/manifest.json"];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Pass through external / API requests
  if (
    url.hostname.includes("firebase") ||
    url.hostname.includes("googleapis") ||
    url.hostname.includes("wa.me") ||
    url.hostname.includes("maps.google") ||
    url.hostname.includes("instagram.com") ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  // Static assets: cache-first
  if (["script","style","image","font"].includes(e.request.destination)) {
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

  // Navigation: network-first, SPA fallback
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match("/index.html")));
    return;
  }

  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = { title: "Lash Studio", body: "", url: "/" };
  try { data = { ...data, ...event.data.json() }; } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    "/icon-192.png",
      badge:   "/icon-192.png",
      data:    { url: data.url },
      vibrate: [100, 50, 100],
    })
  );
});

// ── Notification click — focus or open the app ────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      return clients.openWindow(target);
    })
  );
});
