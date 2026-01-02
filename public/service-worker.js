// Service Worker for offline support and asset caching
const CACHE_NAME = "educfy-v1";
const ASSETS_CACHE = "educfy-assets-v1";
const API_CACHE = "educfy-api-v1";

// Assets to cache on install
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
];

// Install event - cache essential assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Caching essential assets");
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn("[SW] Some assets could not be cached:", err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate event - cleanup old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== ASSETS_CACHE && name !== API_CACHE)
          .map(name => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip chrome extensions and other non-http(s) requests
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // API requests - network first, cache fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache successful responses
          if (response.status === 200) {
            const cache = caches.open(API_CACHE);
            cache.then(c => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request).then((response) => {
            return response || new Response("Offline", { status: 503 });
          });
        })
    );
    return;
  }

  // Asset requests - cache first, network fallback
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(request).then((response) => {
        // Cache successful responses
        if (response.status === 200 && request.method === "GET") {
          const cache = caches.open(ASSETS_CACHE);
          cache.then(c => c.put(request, response.clone()));
        }
        return response;
      }).catch(() => {
        // Network failed and no cache, return offline page
        return caches.match("/index.html");
      });
    })
  );
});

// Handle messages from clients
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data && event.data.type === "CLEAR_CACHE") {
    caches.keys().then(cacheNames => {
      Promise.all(cacheNames.map(name => caches.delete(name)));
    });
  }
});

console.log("[SW] Service Worker loaded");
