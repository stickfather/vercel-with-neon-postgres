// Robust service worker for offline support with Next.js
const CACHE_VERSION = "v2";
const CACHE_NAME = `salc-offline-${CACHE_VERSION}`;
const STATIC_CACHE = `salc-static-${CACHE_VERSION}`;

// Core routes to cache immediately
const STATIC_ASSETS = [
  "/",
  "/registro",
  "/administracion",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log("[SW] Caching static assets");
        return cache.addAll(STATIC_ASSETS).catch((error) => {
          console.warn("[SW] Failed to cache some static assets:", error);
          return Promise.resolve();
        });
      })
      .then(() => {
        console.log("[SW] Service worker installed");
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name.startsWith("salc-") && 
                     name !== CACHE_NAME && 
                     name !== STATIC_CACHE;
            })
            .map((name) => {
              console.log("[SW] Deleting old cache:", name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log("[SW] Service worker activated");
        return self.clients.claim();
      })
  );
});

// Helper to determine if request is for a page navigation
function isNavigationRequest(request) {
  return request.mode === "navigate" || 
         (request.method === "GET" && request.headers.get("accept")?.includes("text/html"));
}

// Helper to determine if URL is an API request
function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

// Helper to determine if URL is a static asset
function isStaticAsset(url) {
  const ext = url.pathname.split(".").pop();
  return ["js", "css", "png", "jpg", "jpeg", "svg", "gif", "woff", "woff2", "ico"].includes(ext);
}

// Fetch event - comprehensive offline handling
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip non-http(s) requests (chrome extensions, etc.)
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // Skip requests to different origins
  if (url.origin !== self.location.origin) {
    return;
  }

  // Handle API requests - don't cache, just pass through
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(request).catch((error) => {
        console.warn("[SW] API request failed offline:", url.pathname);
        // Return a JSON error response for offline API calls
        return new Response(
          JSON.stringify({ 
            error: "Sin conexión", 
            message: "Esta acción requiere conexión a Internet",
            offline: true 
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      })
    );
    return;
  }

  // Handle navigation requests (page loads)
  if (isNavigationRequest(request)) {
    event.respondWith(
      // Try network first for pages
      fetch(request)
        .then((networkResponse) => {
          // Cache the successful response
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log("[SW] Serving cached page:", url.pathname);
              return cachedResponse;
            }
            
            // No cached version, try to serve root page
            console.log("[SW] No cached page, serving root");
            return caches.match("/").then((rootPage) => {
              if (rootPage) {
                return rootPage;
              }
              
              // Last resort: offline fallback page
              return new Response(
                generateOfflinePage(),
                {
                  headers: { "Content-Type": "text/html" },
                  status: 200,
                }
              );
            });
          });
        })
    );
    return;
  }

  // Handle static assets (JS, CSS, images, fonts)
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached asset, update in background
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse);
              });
            }
          }).catch(() => {});
          
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch((error) => {
            console.warn("[SW] Failed to fetch static asset:", url.pathname);
            throw error;
          });
      })
    );
    return;
  }

  // Default: network first, fall back to cache
  event.respondWith(
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
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log("[SW] Serving cached resource:", url.pathname);
            return cachedResponse;
          }
          throw new Error("Resource not available offline");
        });
      })
  );
});

// Generate offline fallback page
function generateOfflinePage() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sin conexión - Inglés Rápido</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #ffe7d1 0%, #c9f5ed 100%);
      color: #1e1b32;
      padding: 20px;
    }
    .container {
      max-width: 500px;
      width: 100%;
      background: white;
      padding: 48px 32px;
      border-radius: 32px;
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
      text-align: center;
    }
    .icon {
      font-size: 64px;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 28px;
      font-weight: 800;
      margin-bottom: 16px;
      color: #00bfa6;
    }
    p {
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 32px;
      color: #6b7280;
    }
    .button {
      display: inline-block;
      background: #00bfa6;
      color: white;
      padding: 14px 32px;
      border-radius: 24px;
      font-weight: 600;
      font-size: 15px;
      text-decoration: none;
      transition: transform 0.2s, background 0.2s;
      cursor: pointer;
      border: none;
      box-shadow: 0 4px 12px rgba(0, 191, 166, 0.3);
    }
    .button:hover {
      background: #04a890;
      transform: translateY(-2px);
    }
    .button:active {
      transform: translateY(0);
    }
    .info {
      margin-top: 24px;
      padding: 16px;
      background: #f3f4f6;
      border-radius: 16px;
      font-size: 14px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📡</div>
    <h1>Sin conexión a Internet</h1>
    <p>No hay conexión a Internet en este momento. La aplicación seguirá funcionando con los datos almacenados localmente.</p>
    <button class="button" onclick="window.location.reload()">Reintentar conexión</button>
    <div class="info">
      <strong>Modo offline activo:</strong> Puedes seguir usando la aplicación. Tus cambios se guardarán y sincronizarán automáticamente cuando se restablezca la conexión.
    </div>
  </div>
  <script>
    // Auto-reload when back online
    window.addEventListener("online", () => {
      setTimeout(() => window.location.reload(), 1000);
    });
  </script>
</body>
</html>`;
}

// Handle messages from clients
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === "CACHE_URLS") {
    const urls = event.data.urls || [];
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(urls);
      })
    );
  }
});

console.log("[SW] Service worker script loaded");
