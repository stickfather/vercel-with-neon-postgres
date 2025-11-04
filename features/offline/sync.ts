"use client";

import {
  getPendingEvents,
  updateEventStatus,
  deletePendingEvent,
  type PendingEvent,
  getStudentsCache,
  getStaffCache,
  setStudentsCache,
  setStaffCache,
  getMetadata,
} from "@/lib/offline/indexeddb";

const SYNC_INTERVAL_MS = 30000; // 30 seconds
const MAX_RETRY_ATTEMPTS = 3;

type SyncStatus = {
  isSyncing: boolean;
  lastSyncAt: number | null;
  pendingCount: number;
  failedCount: number;
};

let syncIntervalId: ReturnType<typeof setInterval> | null = null;
let syncStatus: SyncStatus = {
  isSyncing: false,
  lastSyncAt: null,
  pendingCount: 0,
  failedCount: 0,
};

/**
 * Sync pending events to the server
 */
export async function syncPendingEvents(): Promise<{
  synced: number;
  failed: number;
}> {
  if (syncStatus.isSyncing) {
    return { synced: 0, failed: 0 };
  }

  if (typeof navigator === "undefined" || !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  syncStatus.isSyncing = true;

  try {
    const pending = await getPendingEvents();
    
    if (pending.length === 0) {
      syncStatus.lastSyncAt = Date.now();
      return { synced: 0, failed: 0 };
    }

    // Filter events that haven't exceeded max retries
    const eventsToSync = pending.filter(
      (event) => event.attempts < MAX_RETRY_ATTEMPTS
    );

    if (eventsToSync.length === 0) {
      syncStatus.lastSyncAt = Date.now();
      return { synced: 0, failed: pending.length };
    }

    // Send events to server
    const response = await fetch("/api/offline-sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        events: eventsToSync,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to sync events");
    }

    const result = (await response.json()) as {
      results?: Array<{
        id: string;
        status: "success" | "failed" | "duplicate";
        error?: string;
      }>;
    };

    const results = result.results ?? [];
    let syncedCount = 0;
    let failedCount = 0;

    // Update event statuses based on results
    for (const eventResult of results) {
      if (eventResult.status === "success" || eventResult.status === "duplicate") {
        await deletePendingEvent(eventResult.id);
        syncedCount++;
      } else if (eventResult.status === "failed") {
        await updateEventStatus(
          eventResult.id,
          "failed",
          eventResult.error
        );
        failedCount++;
      }
    }

    syncStatus.lastSyncAt = Date.now();
    
    // Update pending counts
    const remainingPending = await getPendingEvents();
    syncStatus.pendingCount = remainingPending.length;

    return { synced: syncedCount, failed: failedCount };
  } catch (error) {
    console.error("Failed to sync pending events", error);
    return { synced: 0, failed: pending.length };
  } finally {
    syncStatus.isSyncing = false;
  }
}

/**
 * Refresh directory caches from the server
 */
export async function refreshDirectoryCaches(): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.onLine) {
    return;
  }

  try {
    // Fetch students cache
    const studentsResponse = await fetch("/api/students/cache-snapshot");
    if (studentsResponse.ok) {
      const studentsData = (await studentsResponse.json()) as {
        students?: Array<{ id: number; fullName: string }>;
        version?: number;
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
        version?: number;
      };
      
      if (Array.isArray(staffData.staff)) {
        await setStaffCache(staffData.staff);
      }
    }
  } catch (error) {
    console.error("Failed to refresh directory caches", error);
  }
}

/**
 * Start the sync worker
 */
export function startSyncWorker(): void {
  if (typeof window === "undefined") {
    return;
  }

  // Stop existing interval if any
  stopSyncWorker();

  // Initial sync on start
  syncPendingEvents().catch(console.error);
  refreshDirectoryCaches().catch(console.error);

  // Set up periodic sync
  syncIntervalId = setInterval(() => {
    if (navigator.onLine) {
      syncPendingEvents().catch(console.error);
      refreshDirectoryCaches().catch(console.error);
    }
  }, SYNC_INTERVAL_MS);

  // Sync when coming back online
  window.addEventListener("online", handleOnline);
}

function handleOnline() {
  syncPendingEvents().catch(console.error);
  refreshDirectoryCaches().catch(console.error);
}

/**
 * Stop the sync worker
 */
export function stopSyncWorker(): void {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }
  
  if (typeof window !== "undefined") {
    window.removeEventListener("online", handleOnline);
  }
}

/**
 * Get current sync status
 */
export function getSyncStatus(): SyncStatus {
  return { ...syncStatus };
}

/**
 * Update sync status (for internal use)
 */
export function updateSyncStatus(updates: Partial<SyncStatus>): void {
  syncStatus = { ...syncStatus, ...updates };
}
