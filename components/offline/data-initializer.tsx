"use client";

import { useEffect } from "react";

export function DataInitializer() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const initializeData = async () => {
      const isOnline = navigator.onLine;
      
      if (!isOnline) return;

      try {
        // Pre-cache PINs when app loads
        const { syncPinsFromServer, seedDefaultPins } = await import("@/lib/pins");
        
        // Try to fetch from server, fallback to defaults
        await syncPinsFromServer().catch(() => seedDefaultPins());
        
        console.log("Offline data initialized");
      } catch (error) {
        console.warn("Failed to initialize offline data", error);
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
