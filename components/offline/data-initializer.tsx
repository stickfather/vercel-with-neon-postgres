"use client";

import { useEffect } from "react";

export function DataInitializer() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const initializeData = async () => {
      const isOnline = navigator.onLine;
      
      try {
        // Pre-cache PINs when app loads
        const { syncPinsFromServer, seedDefaultPins, getCachedPins } = await import("@/lib/pins");
        
        console.log("[DataInit] Starting initialization (online:", isOnline, ")");
        
        if (isOnline) {
          // Try to fetch from server, fallback to defaults
          await syncPinsFromServer().catch(async (error) => {
            console.warn("[DataInit] Server PIN sync failed, seeding defaults:", error);
            await seedDefaultPins();
          });
          
          // Also pre-cache all students for offline use
          try {
            const { getStudents } = await import("@/lib/dataClient");
            await getStudents(); // Fetch all students (no query = fetch all)
            console.log("[DataInit] Pre-cached all students for offline use");
          } catch (error) {
            console.warn("[DataInit] Failed to pre-cache students", error);
          }
        } else {
          // When offline, ensure default PINs are seeded for first-time offline use
          console.log("[DataInit] Offline mode - seeding default PINs");
          await seedDefaultPins();
        }
        
        // Log all cached PINs for debugging
        const cachedPins = await getCachedPins();
        console.log("[DataInit] Cached PINs after initialization:", cachedPins.map(p => ({ 
          role: p.role, 
          hasPin: !!p.pin,
          pinLength: p.pin?.length 
        })));
        
        console.log("[DataInit] Offline data initialized successfully");
      } catch (error) {
        console.error("[DataInit] Failed to initialize offline data", error);
      }
    };

    // Initialize on mount
    initializeData();

    // Re-initialize when coming back online
    const handleOnline = () => {
      console.log("[DataInit] Network came online, re-initializing...");
      initializeData();
    };

    window.addEventListener("online", handleOnline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return null;
}
