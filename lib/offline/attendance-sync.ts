"use client";

import {
  addPendingEvent,
  getLastSuccessfulSync,
  getPendingEventCount,
  getPendingEventsToSync,
  markEventFailed,
  markEventSynced,
  markEventSyncing,
  updateLastSuccessfulSync,
  type PendingEventKind,
  type PendingEventPayload,
  type PendingEventRecord,
} from "./attendance-store";

export type QueueableAttendanceEvent = PendingEventRecord;

export type AttendanceSyncState = {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSuccessfulSyncAt: string | null;
};

const listeners = new Set<(state: AttendanceSyncState) => void>();

let state: AttendanceSyncState = {
  isOnline: typeof navigator === "undefined" ? true : navigator.onLine,
  isSyncing: false,
  pendingCount: 0,
  lastSuccessfulSyncAt: null,
};

let initializationPromise: Promise<void> | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;

function notify() {
  listeners.forEach((listener) => listener(state));
}

function updateState(patch: Partial<AttendanceSyncState>) {
  state = { ...state, ...patch };
  notify();
}

async function refreshCounts() {
  try {
    const [count, lastSync] = await Promise.all([
      getPendingEventCount(),
      getLastSuccessfulSync(),
    ]);
    updateState({ pendingCount: count, lastSuccessfulSyncAt: lastSync });
  } catch (error) {
    console.error("No se pudo actualizar el estado de sincronización", error);
  }
}

export function subscribeToAttendanceSync(
  listener: (state: AttendanceSyncState) => void,
): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

export async function queueAttendanceEvent(
  kind: PendingEventKind,
  payload: PendingEventPayload,
): Promise<QueueableAttendanceEvent> {
  const record = await addPendingEvent(kind, payload);
  await refreshCounts();
  return record;
}

function getNormalizedOnlineStatus(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

async function processEvent(
  event: PendingEventRecord,
  controller: AbortController,
): Promise<void> {
  await markEventSyncing(event.id);
  updateState({ isSyncing: true });
  try {
    const response = await fetch("/api/offline-sync", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: event.id,
        kind: event.kind,
        payload: event.payload,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      status?: string;
      error?: string;
    };

    if (!response.ok || payload?.status !== "ok") {
      const message =
        typeof payload?.error === "string" && payload.error.trim().length
          ? payload.error
          : "No se pudo sincronizar el evento offline.";
      await markEventFailed(event.id, message);
      return;
    }

    await markEventSynced(event.id);
    await updateLastSuccessfulSync(new Date().toISOString());
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo sincronizar el evento offline.";
    await markEventFailed(event.id, message);
  } finally {
    await refreshCounts();
  }
}

let pendingSyncPromise: Promise<void> | null = null;

export async function attemptSync(): Promise<void> {
  if (pendingSyncPromise) {
    return pendingSyncPromise;
  }

  pendingSyncPromise = (async () => {
    if (!getNormalizedOnlineStatus()) {
      updateState({ isOnline: false });
      pendingSyncPromise = null;
      return;
    }

    updateState({ isOnline: true });

    const events = await getPendingEventsToSync();
    if (!events.length) {
      updateState({ isSyncing: false });
      await refreshCounts();
      pendingSyncPromise = null;
      return;
    }

    const controller = new AbortController();
    try {
      updateState({ isSyncing: true });
      for (const event of events) {
        if (!getNormalizedOnlineStatus()) {
          updateState({ isOnline: false });
          break;
        }
        await processEvent(event, controller);
      }
    } finally {
      controller.abort();
      updateState({ isSyncing: false });
      await refreshCounts();
      pendingSyncPromise = null;
    }
  })();

  return pendingSyncPromise;
}

export function ensureAttendanceSyncInitialized(): Promise<void> {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    await refreshCounts();
    updateState({ isOnline: getNormalizedOnlineStatus() });
    if (typeof window === "undefined") {
      return;
    }

    const handleOnline = () => {
      updateState({ isOnline: true });
      void attemptSync();
      startInterval();
    };
    const handleOffline = () => {
      updateState({ isOnline: false });
      stopInterval();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    startInterval();
    void attemptSync();

    const cleanup = () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      stopInterval();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", cleanup, { once: true });
    }
  })();

  return initializationPromise;
}

function startInterval() {
  if (intervalId != null) {
    return;
  }
  if (!getNormalizedOnlineStatus()) {
    return;
  }
  intervalId = setInterval(() => {
    if (!getNormalizedOnlineStatus()) {
      stopInterval();
      updateState({ isOnline: false });
      return;
    }
    void attemptSync();
  }, 30_000);
}

function stopInterval() {
  if (intervalId != null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
