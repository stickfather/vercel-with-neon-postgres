"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { startSyncWorker, stopSyncWorker, getSyncStatus } from "./sync";
import { getPendingEvents, getFailedEvents } from "@/lib/offline/indexeddb";

type OfflineContextValue = {
  isOnline: boolean;
  pendingCount: number;
  failedCount: number;
  lastSyncAt: number | null;
};

const OfflineContext = createContext<OfflineContextValue>({
  isOnline: true,
  pendingCount: 0,
  failedCount: 0,
  lastSyncAt: null,
});

export function useOffline() {
  return useContext(OfflineContext);
}

type Props = {
  children: ReactNode;
};

export function OfflineProvider({ children }: Props) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // Update online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Start sync worker
    startSyncWorker();

    // Update counts periodically
    const updateCounts = async () => {
      try {
        const pending = await getPendingEvents();
        const failed = await getFailedEvents();
        const status = getSyncStatus();

        setPendingCount(pending.length);
        setFailedCount(failed.length);
        setLastSyncAt(status.lastSyncAt);
      } catch (error) {
        console.error("Failed to update offline counts", error);
      }
    };

    updateCounts();
    const intervalId = setInterval(updateCounts, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      stopSyncWorker();
      clearInterval(intervalId);
    };
  }, []);

  const value: OfflineContextValue = {
    isOnline,
    pendingCount,
    failedCount,
    lastSyncAt,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}
