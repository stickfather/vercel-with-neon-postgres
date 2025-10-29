"use client";

export type PendingEventKind =
  | "student_checkin"
  | "student_checkout"
  | "staff_checkin"
  | "staff_checkout";

export type PendingEventPayload = {
  student_id?: number;
  staff_id?: number;
  lesson_id?: number;
  attendance_id?: number;
  checkin_time?: string;
  checkout_time?: string;
  auto_checkout?: boolean;
  confirm_override?: boolean;
};

export type PendingEventStatus = "queued" | "syncing" | "synced" | "failed";

export type PendingEventRecord = {
  id: string;
  kind: PendingEventKind;
  payload: PendingEventPayload;
  created_at: string;
  status: PendingEventStatus;
  last_error?: string;
};

export type SyncMetadataRecord = {
  last_successful_sync_at: string;
};

const DB_NAME = "salc_offline";
const DB_VERSION = 1;
const PENDING_EVENTS_STORE = "pending_events";
const METADATA_STORE = "metadata";
const METADATA_KEY = "sync";

let databasePromise: Promise<IDBDatabase> | null = null;

function ensureBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function createDatabasePromise(): Promise<IDBDatabase> {
  if (!ensureBrowser()) {
    return Promise.reject(new Error("IndexedDB no está disponible en este entorno."));
  }

  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.addEventListener("upgradeneeded", () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(PENDING_EVENTS_STORE)) {
          db.createObjectStore(PENDING_EVENTS_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          db.createObjectStore(METADATA_STORE);
        }
      });

      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener("error", () => {
        reject(request.error ?? new Error("No se pudo abrir la base de datos offline."));
      });
    });
  }

  return databasePromise;
}

async function getDatabase(): Promise<IDBDatabase> {
  return createDatabasePromise();
}

function toPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => {
      reject(request.error ?? new Error("No se pudo completar la operación en IndexedDB."));
    });
  });
}

async function withStore<T>(
  storeName: typeof PENDING_EVENTS_STORE | typeof METADATA_STORE,
  mode: IDBTransactionMode,
  handler: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  const db = await getDatabase();
  const transaction = db.transaction(storeName, mode);
  const store = transaction.objectStore(storeName);
  const result = await handler(store);
  await new Promise<void>((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve());
    transaction.addEventListener("error", () => {
      reject(transaction.error ?? new Error("Error en la transacción de IndexedDB."));
    });
    transaction.addEventListener("abort", () => {
      reject(transaction.error ?? new Error("Transacción de IndexedDB abortada."));
    });
  });
  return result;
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function addPendingEvent(
  kind: PendingEventKind,
  payload: PendingEventPayload,
): Promise<PendingEventRecord> {
  const record: PendingEventRecord = {
    id: generateId(),
    kind,
    payload,
    created_at: new Date().toISOString(),
    status: "queued",
  };

  await withStore(PENDING_EVENTS_STORE, "readwrite", (store) => {
    store.put(record);
    return undefined;
  });

  return record;
}

export async function getPendingEventsToSync(): Promise<PendingEventRecord[]> {
  return withStore(PENDING_EVENTS_STORE, "readonly", async (store) => {
    const request = store.getAll();
    const all = (await toPromise(request)) as PendingEventRecord[];
    return all.filter((event) => event.status === "queued" || event.status === "failed");
  });
}

export async function getPendingEventCount(): Promise<number> {
  return withStore(PENDING_EVENTS_STORE, "readonly", async (store) => {
    const request = store.getAll();
    const all = (await toPromise(request)) as PendingEventRecord[];
    return all.filter((event) => event.status !== "synced").length;
  });
}

export async function markEventSyncing(id: string): Promise<void> {
  await withStore(PENDING_EVENTS_STORE, "readwrite", async (store) => {
    const current = (await toPromise(store.get(id))) as PendingEventRecord | undefined;
    if (!current) return;
    const updated: PendingEventRecord = { ...current, status: "syncing", last_error: undefined };
    store.put(updated);
  });
}

export async function markEventSynced(id: string): Promise<void> {
  await withStore(PENDING_EVENTS_STORE, "readwrite", async (store) => {
    const current = (await toPromise(store.get(id))) as PendingEventRecord | undefined;
    if (!current) return;
    const updated: PendingEventRecord = { ...current, status: "synced", last_error: undefined };
    store.put(updated);
  });
}

export async function markEventFailed(id: string, errorMessage: string): Promise<void> {
  await withStore(PENDING_EVENTS_STORE, "readwrite", async (store) => {
    const current = (await toPromise(store.get(id))) as PendingEventRecord | undefined;
    if (!current) return;
    const updated: PendingEventRecord = {
      ...current,
      status: "failed",
      last_error: errorMessage,
    };
    store.put(updated);
  });
}

export async function updateLastSuccessfulSync(timestampIso: string): Promise<void> {
  await withStore(METADATA_STORE, "readwrite", (store) => {
    store.put({ last_successful_sync_at: timestampIso }, METADATA_KEY);
    return undefined;
  });
}

export async function getLastSuccessfulSync(): Promise<string | null> {
  return withStore(METADATA_STORE, "readonly", async (store) => {
    const value = (await toPromise(store.get(METADATA_KEY))) as SyncMetadataRecord | undefined;
    return typeof value?.last_successful_sync_at === "string"
      ? value.last_successful_sync_at
      : null;
  });
}

export async function clearSyncedBefore(dateIso: string): Promise<number> {
  return withStore(PENDING_EVENTS_STORE, "readwrite", async (store) => {
    const request = store.getAll();
    const all = (await toPromise(request)) as PendingEventRecord[];
    const threshold = new Date(dateIso).getTime();
    const removable = all.filter((event) => {
      if (event.status !== "synced") return false;
      const createdAt = Date.parse(event.created_at);
      return Number.isFinite(createdAt) && createdAt < threshold;
    });
    removable.forEach((event) => store.delete(event.id));
    return removable.length;
  });
}
