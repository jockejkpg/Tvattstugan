// Simple service worker for Tvättcykel-hanterare (PWA)
const CACHE_NAME = "tvattcykel-v6";
const ASSETS = [
  "./",
  "./index.html",
  "./admin.html",
  "./src/styles.css",
  "./src/app.js",
  "./src/admin.js",
  "./src/pinGate.js",
  "./src/supabaseClient.js",
  "./manifest.json",
  "./assets/icon-firefighter.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png"
];

// Install: pre-cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: cleanup old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for same-origin GET, network fallback
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((resp) => {
      // update cache in background
      const copy = resp.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
      return resp;
    }).catch(() => cached))
  );
});
