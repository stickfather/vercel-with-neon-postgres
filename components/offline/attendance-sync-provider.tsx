"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  attemptSync,
  ensureAttendanceSyncInitialized,
  subscribeToAttendanceSync,
  type AttendanceSyncState,
} from "@/lib/offline/attendance-sync";

const defaultState: AttendanceSyncState = {
  isOnline: typeof navigator === "undefined" ? true : navigator.onLine,
  isSyncing: false,
  pendingCount: 0,
  lastSuccessfulSyncAt: null,
};

type AttendanceSyncContextValue = AttendanceSyncState & {
  syncNow: () => Promise<void>;
};

const AttendanceSyncContext = createContext<AttendanceSyncContextValue | null>(null);

export function useAttendanceSyncContext(): AttendanceSyncContextValue {
  const value = useContext(AttendanceSyncContext);
  if (!value) {
    throw new Error("useAttendanceSyncContext debe usarse dentro de AttendanceSyncProvider");
  }
  return value;
}

type Props = {
  children: React.ReactNode;
};

export function AttendanceSyncProvider({ children }: Props) {
  const [syncState, setSyncState] = useState<AttendanceSyncState>(defaultState);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    ensureAttendanceSyncInitialized()
      .then(() => {
        unsubscribe = subscribeToAttendanceSync((nextState) => {
          setSyncState(nextState);
        });
      })
      .catch((error) => {
        console.error("No se pudo iniciar la sincronización offline", error);
      });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const value = useMemo<AttendanceSyncContextValue>(
    () => ({ ...syncState, syncNow: () => attemptSync() }),
    [syncState],
  );

  return <AttendanceSyncContext.Provider value={value}>{children}</AttendanceSyncContext.Provider>;
}
