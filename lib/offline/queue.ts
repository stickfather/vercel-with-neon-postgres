"use client";

type HeadersRecord = Record<string, string>;

export type QueuedRequest = {
  id: string;
  url: string;
  method: string;
  body?: string | null;
  headers?: HeadersRecord;
  credentials?: RequestCredentials;
  createdAt: number;
};

const STORAGE_KEY = "ir_offline_queue_v1";
export const OFFLINE_QUEUE_EVENT = "ir:offline-queue-changed";

export type OfflineQueueEventDetail = {
  size: number;
};

function notifyQueueChange(size: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<OfflineQueueEventDetail>(OFFLINE_QUEUE_EVENT, {
      detail: { size },
    }),
  );
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function loadQueue(): QueuedRequest[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item === "object");
  } catch (error) {
    console.warn("No se pudo leer la cola sin conexión", error);
    return [];
  }
}

function saveQueue(queue: QueuedRequest[]): void {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    notifyQueueChange(queue.length);
  } catch (error) {
    console.warn("No se pudo guardar la cola sin conexión", error);
  }
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `queued-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function enqueueRequest(
  request: Omit<QueuedRequest, "id" | "createdAt"> & { id?: string; createdAt?: number },
): QueuedRequest {
  const queue = loadQueue();
  const entry: QueuedRequest = {
    id: request.id ?? generateId(),
    createdAt: request.createdAt ?? Date.now(),
    url: request.url,
    method: request.method.toUpperCase(),
    body: request.body ?? null,
    headers: request.headers,
    credentials: request.credentials,
  };
  queue.push(entry);
  saveQueue(queue);
  return entry;
}

export function getQueuedCount(): number {
  return loadQueue().length;
}

export async function processQueue(fetchImpl: typeof fetch = fetch): Promise<number> {
  if (!isBrowser()) {
    return 0;
  }

  const queue = loadQueue();
  if (!queue.length) {
    return 0;
  }

  const remaining: QueuedRequest[] = [];
  let processed = 0;

  for (const request of queue) {
    try {
      const response = await fetchImpl(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body ?? undefined,
        credentials: request.credentials,
      });

      if (!response.ok) {
        remaining.push(request);
        continue;
      }

      processed += 1;
    } catch (error) {
      console.error("No se pudo sincronizar una solicitud pendiente", error);
      remaining.push(request);
    }
  }

  saveQueue(remaining);
  return processed;
}

export function clearQueue() {
  saveQueue([]);
}

