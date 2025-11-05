"use client";

import { useEffect } from "react";

export function DataInitializer() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const initializeData = async () => {
      const isOnline = navigator.onLine;
      
      try {
        // Pre-cache PINs when app loads
        const { syncPinsFromServer, seedDefaultPins } = await import("@/lib/pins");
        
        if (isOnline) {
          // Try to fetch from server, fallback to defaults
          await syncPinsFromServer().catch(() => seedDefaultPins());
          
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
          await seedDefaultPins();
        }
        
        console.log("[DataInit] Offline data initialized (online:", isOnline, ")");
      } catch (error) {
        console.warn("[DataInit] Failed to initialize offline data", error);
      }
    };

    // Initialize on mount
    initializeData();

    // Re-initialize when coming back online
    const handleOnline = () => {
      initializeData();
    };

    window.addEventListener("online", handleOnline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return null;
}
