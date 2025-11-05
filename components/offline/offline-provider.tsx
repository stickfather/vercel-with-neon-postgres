"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  getQueuedCount,
  processQueue,
  OFFLINE_QUEUE_EVENT,
  type OfflineQueueEventDetail,
} from "@/lib/offline/queue";
import { syncOutbox, getOutboxCount } from "@/lib/dataClient";

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

export function OfflineProvider({ children }: Props) {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

  // Update pending count from both localStorage queue and IndexedDB outbox
  const updatePendingCount = useCallback(async () => {
    const localStorageCount = getQueuedCount();
    const outboxCount = await getOutboxCount();
    setPendingCount(localStorageCount + outboxCount);
  }, []);

  const syncQueue = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      // Sync both localStorage queue and IndexedDB outbox
      const [processedQueue, syncResult] = await Promise.all([
        processQueue(),
        syncOutbox(),
      ]);
      
      const totalProcessed = processedQueue + syncResult.processed;
      
      if (totalProcessed > 0) {
        setLastSyncAt(Date.now());
      }
      
      await updatePendingCount();
    } catch (error) {
      console.error("No se pudo sincronizar la cola sin conexión", error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, updatePendingCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Initialize pending count
    updatePendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      void syncQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      void updatePendingCount();
    };
    const handleQueueChange = (event: Event) => {
      const detail = (event as CustomEvent<OfflineQueueEventDetail>).detail;
      if (detail && typeof detail.size === "number") {
        void updatePendingCount();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener(OFFLINE_QUEUE_EVENT, handleQueueChange);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(OFFLINE_QUEUE_EVENT, handleQueueChange);
    };
  }, [syncQueue, updatePendingCount]);

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

