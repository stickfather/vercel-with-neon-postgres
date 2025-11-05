"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        console.log("[App] Service Worker registered:", registration.scope);

        // Check for updates periodically
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                console.log("[App] New service worker available, updating...");
                // Tell the new service worker to skip waiting
                newWorker.postMessage({ type: "SKIP_WAITING" });
              }
            });
          }
        });

        // Handle controller change (new SW activated)
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          console.log("[App] Service worker updated, reloading page...");
          window.location.reload();
        });

        // Check for updates every 60 seconds
        setInterval(() => {
          registration.update();
        }, 60000);
        
      } catch (error) {
        console.error("[App] Service Worker registration failed:", error);
      }
    };

    registerServiceWorker();

    // Cache visited pages for offline access
    const cacheCurrentPage = () => {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "CACHE_URLS",
          urls: [window.location.pathname],
        });
      }
    };

    // Cache page on navigation
    window.addEventListener("load", cacheCurrentPage);
    
    // For SPA navigation (Next.js)
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === "navigation") {
          cacheCurrentPage();
        }
      }
    });
    
    try {
      observer.observe({ entryTypes: ["navigation"] });
    } catch (e) {
      // Performance Observer not supported
    }

    return () => {
      window.removeEventListener("load", cacheCurrentPage);
      observer.disconnect();
    };
  }, []);

  return null;
}
