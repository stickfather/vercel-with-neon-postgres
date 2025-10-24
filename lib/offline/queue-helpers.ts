"use client";

export type OfflineQueueItem<TPayload> = {
  id: string;
  createdAt: number;
  payload: TPayload;
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function generateQueueId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function readQueue<TPayload>(
  storageKey: string,
): OfflineQueueItem<TPayload>[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => {
        if (
          entry &&
          typeof entry === "object" &&
          "id" in entry &&
          "createdAt" in entry &&
          "payload" in entry
        ) {
          return entry as OfflineQueueItem<TPayload>;
        }
        return null;
      })
      .filter((entry): entry is OfflineQueueItem<TPayload> => Boolean(entry));
  } catch (error) {
    console.error("No se pudo leer la cola offline", error);
    return [];
  }
}

export function writeQueue<TPayload>(
  storageKey: string,
  items: OfflineQueueItem<TPayload>[],
) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(items));
  } catch (error) {
    console.error("No se pudo guardar la cola offline", error);
  }
}

export function isOfflineError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return true;
  }

  return error instanceof TypeError;
}
