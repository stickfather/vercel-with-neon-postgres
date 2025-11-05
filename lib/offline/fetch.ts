"use client";

import { enqueueRequest } from "@/lib/offline/queue";
import { db, generateId } from "@/lib/db";

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
    const url = resolveUrl(input);

    // Enqueue in localStorage (existing mechanism)
    enqueueRequest({
      url,
      method,
      body,
      headers,
      credentials: init.credentials,
    });

    // Also store in IndexedDB outbox for new offline system
    try {
      const payload = body ? JSON.parse(body) : {};
      
      // Determine outbox type based on URL
      let outboxType = "unknown";
      if (url.includes("/api/check-in")) {
        outboxType = "student-check-in";
        
        // Optimistically update IndexedDB
        if (payload.studentId && payload.lessonId) {
          await db.recentAttendance.add({
            id: generateId(),
            personType: "student",
            personId: payload.studentId,
            type: "check-in",
            ts: Date.now(),
            metadata: { lessonId: payload.lessonId, level: payload.level },
          });
          
          await db.lastCheckins.put({
            personType: "student",
            personId: payload.studentId,
            lastCheckinAt: Date.now(),
          });
        }
      } else if (url.includes("/api/check-out")) {
        outboxType = "student-check-out";
        
        if (payload.studentId) {
          await db.recentAttendance.add({
            id: generateId(),
            personType: "student",
            personId: payload.studentId,
            type: "check-out",
            ts: Date.now(),
          });
        }
      } else if (url.includes("/api/staff/check-in")) {
        outboxType = "staff-check-in";
        
        if (payload.staffId) {
          await db.recentAttendance.add({
            id: generateId(),
            personType: "staff",
            personId: payload.staffId,
            type: "check-in",
            ts: Date.now(),
          });
          
          await db.lastCheckins.put({
            personType: "staff",
            personId: payload.staffId,
            lastCheckinAt: Date.now(),
          });
        }
      } else if (url.includes("/api/staff/check-out")) {
        outboxType = "staff-check-out";
        
        if (payload.staffId) {
          await db.recentAttendance.add({
            id: generateId(),
            personType: "staff",
            personId: payload.staffId,
            type: "check-out",
            ts: Date.now(),
          });
        }
      }
      
      await db.outbox.add({
        id: generateId(),
        type: outboxType,
        payload,
        createdAt: Date.now(),
        attemptCount: 0,
        status: "pending",
      });
    } catch (error) {
      console.warn("Failed to store in IndexedDB outbox", error);
    }

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

