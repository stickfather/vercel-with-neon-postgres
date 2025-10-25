"use client";

import { enqueueRequest } from "@/lib/offline/queue";

type QueueableInit = RequestInit & {
  offlineLabel?: string;
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function normalizeHeaders(headers?: HeadersInit): Record<string, string> | undefined {
  if (!headers) return undefined;
  if (headers instanceof Headers) {
    const record: Record<string, string> = {};
    headers.forEach((value, key) => {
      record[key] = value;
    });
    return record;
  }
  if (Array.isArray(headers)) {
    return headers.reduce<Record<string, string>>((acc, [key, value]) => {
      acc[String(key)] = String(value);
      return acc;
    }, {});
  }
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : String(value)]),
  );
}

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

export async function queueableFetch(
  input: RequestInfo | URL,
  init: QueueableInit = {},
): Promise<Response> {
  if (!isBrowser()) {
    return fetch(input, init);
  }

  const method = (init.method ?? "GET").toUpperCase();
  const isMutating = method !== "GET" && method !== "HEAD";
  const isOnline = navigator.onLine;

  if (!isOnline && isMutating) {
    const body = typeof init.body === "string" ? init.body : init.body == null ? null : String(init.body);
    const headers = normalizeHeaders(init.headers);

    enqueueRequest({
      url: resolveUrl(input),
      method,
      body,
      headers,
      credentials: init.credentials,
    });

    return new Response(
      JSON.stringify({ queued: true, label: init.offlineLabel ?? "pending" }),
      {
        status: 202,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  return fetch(input, init);
}

