"use client";

import { db, generateId, logOfflineEvent, type Student, type Staff, type Lesson, type Pin } from "@/lib/db";

// Network status helper
function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

// Read operations
export async function getStudents(query?: string): Promise<Student[]> {
  try {
    if (isOnline()) {
      // Fetch from server and cache
      const params = new URLSearchParams();
      if (query) params.set("query", query);
      const response = await fetch(`/api/students?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        const students = (data.students || []) as Student[];
        
        // Cache students in IndexedDB
        if (students.length > 0) {
          await db.students.bulkPut(students);
        }
        
        return students;
      }
    }
    
    // Offline or fetch failed - read from IndexedDB
    logOfflineEvent("getStudents", "Reading from cache");
    
    if (query && query.trim()) {
      const normalizedQuery = query.toLowerCase().trim();
      const all = await db.students.toArray();
      return all.filter((s) =>
        s.fullName.toLowerCase().includes(normalizedQuery)
      );
    }
    
    return await db.students.toArray();
  } catch (error) {
    console.error("Failed to get students", error);
    // Fallback to cache
    if (query && query.trim()) {
      const normalizedQuery = query.toLowerCase().trim();
      const all = await db.students.toArray();
      return all.filter((s) =>
        s.fullName.toLowerCase().includes(normalizedQuery)
      );
    }
    return await db.students.toArray();
  }
}

export async function getStaff(): Promise<Staff[]> {
  try {
    if (isOnline()) {
      const response = await fetch("/api/staff");
      
      if (response.ok) {
        const data = await response.json();
        const staff = (data.staff || []) as Staff[];
        
        if (staff.length > 0) {
          await db.staff.bulkPut(staff);
        }
        
        return staff;
      }
    }
    
    logOfflineEvent("getStaff", "Reading from cache");
    return await db.staff.toArray();
  } catch (error) {
    console.error("Failed to get staff", error);
    return await db.staff.toArray();
  }
}

export async function getLessons(): Promise<Lesson[]> {
  try {
    if (isOnline()) {
      const response = await fetch("/api/lessons");
      
      if (response.ok) {
        const lessons = (await response.json()) as Lesson[];
        
        if (lessons.length > 0) {
          await db.lessons.bulkPut(lessons);
        }
        
        return lessons;
      }
    }
    
    logOfflineEvent("getLessons", "Reading from cache");
    return await db.lessons.toArray();
  } catch (error) {
    console.error("Failed to get lessons", error);
    return await db.lessons.toArray();
  }
}

export async function getPins(): Promise<Pin[]> {
  try {
    if (isOnline()) {
      const response = await fetch("/api/pins");
      
      if (response.ok) {
        const pins = (await response.json()) as Pin[];
        
        if (pins.length > 0) {
          await db.pins.bulkPut(pins);
        }
        
        return pins;
      }
    }
    
    logOfflineEvent("getPins", "Reading from cache");
    return await db.pins.toArray();
  } catch (error) {
    console.error("Failed to get PINs", error);
    return await db.pins.toArray();
  }
}

export async function getLastCheckins() {
  return await db.lastCheckins.toArray();
}

export async function getRecentAttendance(limit = 10) {
  return await db.recentAttendance
    .orderBy("ts")
    .reverse()
    .limit(limit)
    .toArray();
}

// Mutation operations
export async function checkinStudent(
  studentId: number,
  lessonId: number,
  level: string,
  confirmOverride = false
): Promise<{ queued: boolean }> {
  const payload = { studentId, lessonId, level, confirmOverride };
  
  if (!isOnline()) {
    // Queue for later
    await db.outbox.add({
      id: generateId(),
      type: "student-check-in",
      payload,
      createdAt: Date.now(),
      attemptCount: 0,
      status: "pending",
    });
    
    // Update local cache optimistically
    await db.recentAttendance.add({
      id: generateId(),
      personType: "student",
      personId: studentId,
      type: "check-in",
      ts: Date.now(),
      metadata: { lessonId, level },
    });
    
    await db.lastCheckins.put({
      personType: "student",
      personId: studentId,
      lastCheckinAt: Date.now(),
    });
    
    logOfflineEvent("checkinStudent", `Student ${studentId} queued for sync`);
    return { queued: true };
  }
  
  // Online - make the API call
  try {
    const response = await fetch("/api/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error("Check-in failed");
    }
    
    // Update cache
    await db.recentAttendance.add({
      id: generateId(),
      personType: "student",
      personId: studentId,
      type: "check-in",
      ts: Date.now(),
      metadata: { lessonId, level },
    });
    
    await db.lastCheckins.put({
      personType: "student",
      personId: studentId,
      lastCheckinAt: Date.now(),
    });
    
    return { queued: false };
  } catch (error) {
    // Fallback to queue
    await db.outbox.add({
      id: generateId(),
      type: "student-check-in",
      payload,
      createdAt: Date.now(),
      attemptCount: 0,
      status: "pending",
    });
    
    logOfflineEvent("checkinStudent", `Student ${studentId} queued after error`);
    return { queued: true };
  }
}

export async function checkoutStudent(studentId: number): Promise<{ queued: boolean }> {
  const payload = { studentId };
  
  if (!isOnline()) {
    await db.outbox.add({
      id: generateId(),
      type: "student-check-out",
      payload,
      createdAt: Date.now(),
      attemptCount: 0,
      status: "pending",
    });
    
    await db.recentAttendance.add({
      id: generateId(),
      personType: "student",
      personId: studentId,
      type: "check-out",
      ts: Date.now(),
    });
    
    logOfflineEvent("checkoutStudent", `Student ${studentId} queued for sync`);
    return { queued: true };
  }
  
  try {
    const response = await fetch("/api/check-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error("Check-out failed");
    }
    
    await db.recentAttendance.add({
      id: generateId(),
      personType: "student",
      personId: studentId,
      type: "check-out",
      ts: Date.now(),
    });
    
    return { queued: false };
  } catch (error) {
    await db.outbox.add({
      id: generateId(),
      type: "student-check-out",
      payload,
      createdAt: Date.now(),
      attemptCount: 0,
      status: "pending",
    });
    
    logOfflineEvent("checkoutStudent", `Student ${studentId} queued after error`);
    return { queued: true };
  }
}

export async function checkinStaff(staffId: number): Promise<{ queued: boolean }> {
  const payload = { staffId };
  
  if (!isOnline()) {
    await db.outbox.add({
      id: generateId(),
      type: "staff-check-in",
      payload,
      createdAt: Date.now(),
      attemptCount: 0,
      status: "pending",
    });
    
    await db.recentAttendance.add({
      id: generateId(),
      personType: "staff",
      personId: staffId,
      type: "check-in",
      ts: Date.now(),
    });
    
    await db.lastCheckins.put({
      personType: "staff",
      personId: staffId,
      lastCheckinAt: Date.now(),
    });
    
    logOfflineEvent("checkinStaff", `Staff ${staffId} queued for sync`);
    return { queued: true };
  }
  
  try {
    const response = await fetch("/api/staff/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error("Staff check-in failed");
    }
    
    await db.recentAttendance.add({
      id: generateId(),
      personType: "staff",
      personId: staffId,
      type: "check-in",
      ts: Date.now(),
    });
    
    await db.lastCheckins.put({
      personType: "staff",
      personId: staffId,
      lastCheckinAt: Date.now(),
    });
    
    return { queued: false };
  } catch (error) {
    await db.outbox.add({
      id: generateId(),
      type: "staff-check-in",
      payload,
      createdAt: Date.now(),
      attemptCount: 0,
      status: "pending",
    });
    
    logOfflineEvent("checkinStaff", `Staff ${staffId} queued after error`);
    return { queued: true };
  }
}

export async function checkoutStaff(staffId: number): Promise<{ queued: boolean }> {
  const payload = { staffId };
  
  if (!isOnline()) {
    await db.outbox.add({
      id: generateId(),
      type: "staff-check-out",
      payload,
      createdAt: Date.now(),
      attemptCount: 0,
      status: "pending",
    });
    
    await db.recentAttendance.add({
      id: generateId(),
      personType: "staff",
      personId: staffId,
      type: "check-out",
      ts: Date.now(),
    });
    
    logOfflineEvent("checkoutStaff", `Staff ${staffId} queued for sync`);
    return { queued: true };
  }
  
  try {
    const response = await fetch("/api/staff/check-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error("Staff check-out failed");
    }
    
    await db.recentAttendance.add({
      id: generateId(),
      personType: "staff",
      personId: staffId,
      type: "check-out",
      ts: Date.now(),
    });
    
    return { queued: false };
  } catch (error) {
    await db.outbox.add({
      id: generateId(),
      type: "staff-check-out",
      payload,
      createdAt: Date.now(),
      attemptCount: 0,
      status: "pending",
    });
    
    logOfflineEvent("checkoutStaff", `Staff ${staffId} queued after error`);
    return { queued: true };
  }
}

const MAX_RETRY_ATTEMPTS = 3;

// Sync engine
export async function syncOutbox(): Promise<{ processed: number; failed: number }> {
  if (!isOnline()) {
    return { processed: 0, failed: 0 };
  }
  
  const pending = await db.outbox.where("status").equals("pending").toArray();
  
  let processed = 0;
  let failed = 0;
  
  for (const entry of pending) {
    try {
      let response: Response | null = null;
      
      switch (entry.type) {
        case "student-check-in": {
          const payload = entry.payload as { studentId: number; lessonId: number; level: string; confirmOverride: boolean };
          response = await fetch("/api/check-in", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          break;
        }
        
        case "student-check-out": {
          const payload = entry.payload as { studentId: number };
          response = await fetch("/api/check-out", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          break;
        }
        
        case "staff-check-in": {
          const payload = entry.payload as { staffId: number };
          response = await fetch("/api/staff/check-in", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          break;
        }
        
        case "staff-check-out": {
          const payload = entry.payload as { staffId: number };
          response = await fetch("/api/staff/check-out", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          break;
        }
      }
      
      if (response && response.ok) {
        await db.outbox.update(entry.id, { status: "done" });
        processed++;
      } else {
        await db.outbox.update(entry.id, {
          attemptCount: entry.attemptCount + 1,
          status: entry.attemptCount + 1 >= MAX_RETRY_ATTEMPTS ? "failed" : "pending",
        });
        failed++;
      }
    } catch (error) {
      console.error(`Failed to sync outbox entry ${entry.id}`, error);
      await db.outbox.update(entry.id, {
        attemptCount: entry.attemptCount + 1,
        status: entry.attemptCount + 1 >= MAX_RETRY_ATTEMPTS ? "failed" : "pending",
      });
      failed++;
    }
  }
  
  logOfflineEvent("syncOutbox", `Processed: ${processed}, Failed: ${failed}`);
  return { processed, failed };
}

export async function getOutboxCount(): Promise<number> {
  return await db.outbox.where("status").equals("pending").count();
}
