"use client";

import Dexie, { type EntityTable } from "dexie";

// Database schema types
export interface Student {
  id: number;
  fullName: string;
  level?: string;
  lastCheckinAt?: string;
  isActive?: boolean;
}

export interface Staff {
  id: number;
  fullName: string;
  role?: string;
  isActive?: boolean;
}

export interface Pin {
  role: string; // 'staff' | 'manager'
  pin: string; // plaintext PIN
  updatedAt?: string;
}

export interface RecentAttendance {
  id: string;
  personType: "student" | "staff";
  personId: number;
  type: "check-in" | "check-out";
  ts: number;
  metadata?: Record<string, unknown>;
}

export interface LastCheckin {
  id?: number;
  personType: "student" | "staff";
  personId: number;
  lastCheckinAt: number;
}

export interface OutboxEntry {
  id: string;
  type: string;
  payload: unknown;
  createdAt: number;
  attemptCount: number;
  status: "pending" | "done" | "failed" | "conflict";
}

export interface OfflineLog {
  id: string;
  ts: number;
  event: string;
  details?: string;
}

export interface Lesson {
  id: number;
  lesson: string;
  level: string;
  seq?: number | null;
}

// Define the database
class SalcOfflineDB extends Dexie {
  students!: EntityTable<Student, "id">;
  staff!: EntityTable<Staff, "id">;
  pins!: EntityTable<Pin, "role">;
  recentAttendance!: EntityTable<RecentAttendance, "id">;
  lastCheckins!: EntityTable<LastCheckin, "id">;
  outbox!: EntityTable<OutboxEntry, "id">;
  offlineLog!: EntityTable<OfflineLog, "id">;
  lessons!: EntityTable<Lesson, "id">;

  constructor() {
    super("salc_offline");
    this.version(1).stores({
      students: "id, fullName, level",
      staff: "id, fullName, role",
      pins: "role",
      recentAttendance: "id, personType, personId, ts",
      lastCheckins: "++id, [personType+personId]",
      outbox: "id, status, createdAt",
      offlineLog: "id, ts",
      lessons: "id, level",
    });
  }
}

// Create a singleton instance
export const db = new SalcOfflineDB();

// Utility functions
export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function logOfflineEvent(event: string, details?: string): void {
  if (typeof window === "undefined") return;
  
  try {
    db.offlineLog.add({
      id: generateId(),
      ts: Date.now(),
      event,
      details,
    });
  } catch (error) {
    console.warn("Failed to log offline event", error);
  }
}
