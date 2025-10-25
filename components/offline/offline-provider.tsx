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

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(OFFLINE_QUEUE_EVENT, handleQueueChange);
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

