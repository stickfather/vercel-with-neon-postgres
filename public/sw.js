// Simple service worker for offline support
const CACHE_NAME = "salc-offline-v1";
const STATIC_CACHE = "salc-static-v1";

// Files to cache immediately
const STATIC_ASSETS = [
  "/",
  "/registro",
  "/offline",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((error) => {
        console.warn("Failed to cache some static assets:", error);
        // Don't fail installation if some assets can't be cached
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip chrome extensions and non-http(s) requests
  if (!url.protocol.startsWith("http")) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached response and update cache in background
        event.waitUntil(
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, responseToCache);
                });
              }
              return networkResponse;
            })
            .catch(() => {
              // Network failed, cached response already returned
            })
        );
        return cachedResponse;
      }

      // Not in cache, fetch from network
      return fetch(request)
        .then((networkResponse) => {
          // Cache successful responses
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Network failed and no cache - return offline page for navigation requests
          if (request.mode === "navigate") {
            return caches.match("/").then((response) => {
              if (response) {
                return response;
              }
              // Fallback offline response
              return new Response(
                `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sin conexión - Inglés Rápido</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #ffe7d1 0%, #c9f5ed 100%);
      color: #1e1b32;
      text-align: center;
      padding: 20px;
    }
    .container {
      max-width: 400px;
      background: white;
      padding: 40px;
      border-radius: 24px;
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
    }
    h1 {
      font-size: 24px;
      margin: 0 0 16px;
      color: #00bfa6;
    }
    p {
      margin: 0 0 24px;
      line-height: 1.6;
    }
    button {
      background: #00bfa6;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 24px;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
    }
    button:hover {
      background: #04a890;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📡 Sin conexión</h1>
    <p>No hay conexión a Internet. La aplicación funcionará en modo offline usando los datos almacenados localmente.</p>
    <button onclick="location.reload()">Reintentar</button>
  </div>
</body>
</html>`,
                {
                  headers: { "Content-Type": "text/html" },
                  status: 200,
                }
              );
            });
          }
          throw new Error("Network request failed");
        });
    })
  );
});
