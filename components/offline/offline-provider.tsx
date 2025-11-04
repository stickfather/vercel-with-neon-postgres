"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  getQueuedCount,
  processQueue,
  OFFLINE_QUEUE_EVENT,
  type OfflineQueueEventDetail,
} from "@/lib/offline/queue";

type OfflineContextValue = {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncAt: number | null;
  triggerSync: () => Promise<void>;
};

const OfflineContext = createContext<OfflineContextValue | undefined>(undefined);

export function useOfflineStatus(): OfflineContextValue {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error("useOfflineStatus debe usarse dentro de OfflineProvider");
  }
  return context;
}

type Props = {
  children: React.ReactNode;
};

async function refreshDirectoryCaches() {
  if (typeof navigator === "undefined" || !navigator.onLine) {
    return;
  }

  try {
    // Import dynamically to avoid SSR issues
    const { setStudentsCache, setStaffCache } = await import("@/lib/offline/indexeddb");

    // Fetch students cache
    const studentsResponse = await fetch("/api/students/cache-snapshot");
    if (studentsResponse.ok) {
      const studentsData = (await studentsResponse.json()) as {
        students?: Array<{
          id: number;
          fullName: string;
          lastCheckIn?: string | null;
          currentLesson?: string | null;
          isCheckedIn?: boolean;
        }>;
      };
      
      if (Array.isArray(studentsData.students)) {
        await setStudentsCache(studentsData.students);
      }
    }

    // Fetch staff cache
    const staffResponse = await fetch("/api/staff/cache-snapshot");
    if (staffResponse.ok) {
      const staffData = (await staffResponse.json()) as {
        staff?: Array<{ id: number; fullName: string; role: string | null }>;
      };
      
      if (Array.isArray(staffData.staff)) {
        await setStaffCache(staffData.staff);
      }
    }
  } catch (error) {
    console.error("Failed to refresh directory caches", error);
  }
}

export function OfflineProvider({ children }: Props) {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [pendingCount, setPendingCount] = useState(() => getQueuedCount());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

  const syncQueue = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const processed = await processQueue();
      if (processed > 0) {
        setLastSyncAt(Date.now());
      }
      
      // Also refresh directory caches when syncing
      await refreshDirectoryCaches();
    } catch (error) {
      console.error("No se pudo sincronizar la cola sin conexión", error);
    } finally {
      setPendingCount(getQueuedCount());
      setIsSyncing(false);
    }
  }, [isSyncing]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsOnline(true);
      void syncQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setPendingCount(getQueuedCount());
    };
    const handleQueueChange = (event: Event) => {
      const detail = (event as CustomEvent<OfflineQueueEventDetail>).detail;
      setPendingCount(
        detail && typeof detail.size === "number"
          ? detail.size
          : getQueuedCount(),
      );
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener(OFFLINE_QUEUE_EVENT, handleQueueChange);

    // Initial cache refresh on mount
    void refreshDirectoryCaches();

    // Periodic cache refresh every 5 minutes when online
    const refreshInterval = setInterval(() => {
      if (navigator.onLine) {
        void refreshDirectoryCaches();
      }
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(OFFLINE_QUEUE_EVENT, handleQueueChange);
      clearInterval(refreshInterval);
    };
  }, [syncQueue]);

  useEffect(() => {
    if (isOnline) {
      void syncQueue();
    }
  }, [isOnline, syncQueue]);

  const value = useMemo<OfflineContextValue>(
    () => ({ isOnline, pendingCount, isSyncing, lastSyncAt, triggerSync: syncQueue }),
    [isOnline, pendingCount, isSyncing, lastSyncAt, syncQueue],
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

