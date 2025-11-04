"use client";

const DB_NAME = "salc_offline";
const DB_VERSION = 2; // Increment version for schema change

export type CacheMetadata = {
  key: string;
  version: number;
  lastUpdated: number;
};

export type PendingEvent = {
  id: string;
  type: "student-checkin" | "student-checkout" | "staff-checkin" | "staff-checkout";
  payload: Record<string, unknown>;
  createdAt: number;
  attempts: number;
  status: "pending" | "failed" | "synced";
  error?: string;
};

export type StudentCacheEntry = {
  id: number;
  fullName: string;
  lastCheckIn?: string | null;
  currentLesson?: string | null;
  isCheckedIn?: boolean;
};

export type StaffCacheEntry = {
  id: number;
  fullName: string;
  role: string | null;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (!isBrowser()) {
    return Promise.reject(new Error("IndexedDB not available"));
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error("Failed to open IndexedDB"));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Students cache
      if (!db.objectStoreNames.contains("students_cache")) {
        db.createObjectStore("students_cache", { keyPath: "id" });
      }

      // Staff cache
      if (!db.objectStoreNames.contains("staff_cache")) {
        db.createObjectStore("staff_cache", { keyPath: "id" });
      }

      // Metadata
      if (!db.objectStoreNames.contains("metadata")) {
        db.createObjectStore("metadata", { keyPath: "key" });
      }

      // Pending events
      if (!db.objectStoreNames.contains("pending_events")) {
        const store = db.createObjectStore("pending_events", { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
  });

  return dbPromise;
}

export async function setStudentsCache(students: StudentCacheEntry[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("students_cache", "readwrite");
  const store = tx.objectStore("students_cache");

  // Clear existing data
  await new Promise<void>((resolve, reject) => {
    const clearRequest = store.clear();
    clearRequest.onsuccess = () => resolve();
    clearRequest.onerror = () => reject(clearRequest.error);
  });

  // Add new data
  for (const student of students) {
    await new Promise<void>((resolve, reject) => {
      const addRequest = store.add(student);
      addRequest.onsuccess = () => resolve();
      addRequest.onerror = () => reject(addRequest.error);
    });
  }

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Update metadata
  await setMetadata({
    key: "students_cache",
    version: 1,
    lastUpdated: Date.now(),
  });
}

export async function getStudentsCache(): Promise<StudentCacheEntry[]> {
  const db = await openDB();
  const tx = db.transaction("students_cache", "readonly");
  const store = tx.objectStore("students_cache");

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as StudentCacheEntry[]);
    request.onerror = () => reject(request.error);
  });
}

export async function setStaffCache(staff: StaffCacheEntry[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("staff_cache", "readwrite");
  const store = tx.objectStore("staff_cache");

  // Clear existing data
  await new Promise<void>((resolve, reject) => {
    const clearRequest = store.clear();
    clearRequest.onsuccess = () => resolve();
    clearRequest.onerror = () => reject(clearRequest.error);
  });

  // Add new data
  for (const member of staff) {
    await new Promise<void>((resolve, reject) => {
      const addRequest = store.add(member);
      addRequest.onsuccess = () => resolve();
      addRequest.onerror = () => reject(addRequest.error);
    });
  }

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Update metadata
  await setMetadata({
    key: "staff_cache",
    version: 1,
    lastUpdated: Date.now(),
  });
}

export async function getStaffCache(): Promise<StaffCacheEntry[]> {
  const db = await openDB();
  const tx = db.transaction("staff_cache", "readonly");
  const store = tx.objectStore("staff_cache");

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as StaffCacheEntry[]);
    request.onerror = () => reject(request.error);
  });
}

export async function setMetadata(metadata: CacheMetadata): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("metadata", "readwrite");
  const store = tx.objectStore("metadata");

  return new Promise((resolve, reject) => {
    const request = store.put(metadata);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getMetadata(key: string): Promise<CacheMetadata | null> {
  const db = await openDB();
  const tx = db.transaction("metadata", "readonly");
  const store = tx.objectStore("metadata");

  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result as CacheMetadata | undefined ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function addPendingEvent(event: Omit<PendingEvent, "id" | "attempts" | "createdAt" | "status">): Promise<string> {
  const db = await openDB();
  const tx = db.transaction("pending_events", "readwrite");
  const store = tx.objectStore("pending_events");

  const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const fullEvent: PendingEvent = {
    id,
    ...event,
    attempts: 0,
    createdAt: Date.now(),
    status: "pending",
  };

  return new Promise((resolve, reject) => {
    const request = store.add(fullEvent);
    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingEvents(): Promise<PendingEvent[]> {
  const db = await openDB();
  const tx = db.transaction("pending_events", "readonly");
  const store = tx.objectStore("pending_events");
  const index = store.index("status");

  return new Promise((resolve, reject) => {
    const request = index.getAll("pending");
    request.onsuccess = () => resolve(request.result as PendingEvent[]);
    request.onerror = () => reject(request.error);
  });
}

export async function getFailedEvents(): Promise<PendingEvent[]> {
  const db = await openDB();
  const tx = db.transaction("pending_events", "readonly");
  const store = tx.objectStore("pending_events");
  const index = store.index("status");

  return new Promise((resolve, reject) => {
    const request = index.getAll("failed");
    request.onsuccess = () => resolve(request.result as PendingEvent[]);
    request.onerror = () => reject(request.error);
  });
}

export async function updateEventStatus(
  id: string,
  status: PendingEvent["status"],
  error?: string
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("pending_events", "readwrite");
  const store = tx.objectStore("pending_events");

  return new Promise((resolve, reject) => {
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const event = getRequest.result as PendingEvent | undefined;
      if (!event) {
        reject(new Error("Event not found"));
        return;
      }

      const updated: PendingEvent = {
        ...event,
        status,
        attempts: event.attempts + 1,
        error,
      };

      const putRequest = store.put(updated);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function deletePendingEvent(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("pending_events", "readwrite");
  const store = tx.objectStore("pending_events");

  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllCaches(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(
    ["students_cache", "staff_cache", "metadata", "pending_events"],
    "readwrite"
  );

  await Promise.all([
    new Promise<void>((resolve, reject) => {
      const req = tx.objectStore("students_cache").clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }),
    new Promise<void>((resolve, reject) => {
      const req = tx.objectStore("staff_cache").clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }),
    new Promise<void>((resolve, reject) => {
      const req = tx.objectStore("metadata").clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }),
    new Promise<void>((resolve, reject) => {
      const req = tx.objectStore("pending_events").clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }),
  ]);
}
