"use client";

import { db, type Pin } from "@/lib/db";

// Validate PIN offline (plaintext comparison)
export async function validatePinOffline(role: string, inputPin: string): Promise<boolean> {
  try {
    const pin = await db.pins.get(role);
    
    if (!pin) {
      console.log(`[Offline PIN] No cached PIN found for role: ${role}`);
      return false;
    }
    
    const isValid = pin.pin === inputPin.trim();
    console.log(`[Offline PIN] Validation for ${role}:`, isValid);
    return isValid;
  } catch (error) {
    console.error("Failed to validate PIN offline", error);
    return false;
  }
}

// Store PIN after successful online validation (for offline use)
export async function storePinForOfflineUse(role: string, pin: string): Promise<void> {
  try {
    await db.pins.put({
      role,
      pin: pin.trim(),
      updatedAt: new Date().toISOString(),
    });
    console.log(`[Offline PIN] Stored PIN for role: ${role}`);
  } catch (error) {
    console.error("Failed to store PIN for offline use", error);
  }
}

// Fetch and cache PINs from server
export async function syncPinsFromServer(): Promise<void> {
  try {
    const response = await fetch("/api/pins");
    
    if (!response.ok) {
      console.warn("Failed to fetch PINs from server");
      return;
    }
    
    const pins = (await response.json()) as Pin[];
    
    if (pins.length > 0) {
      await db.pins.bulkPut(pins);
      console.log(`[Offline PIN] Synced ${pins.length} PINs from server`);
    }
  } catch (error) {
    console.error("Failed to sync PINs", error);
  }
}

/**
 * Seed default PINs for development (if none exist)
 * 
 * WARNING: These are development-only defaults.
 * In production, PINs should be set via admin interface or environment variables.
 */
export async function seedDefaultPins(): Promise<void> {
  const existingPins = await db.pins.toArray();
  
  if (existingPins.length === 0) {
    // Development defaults - DO NOT use in production
    await db.pins.bulkPut([
      { role: "staff", pin: "1234", updatedAt: new Date().toISOString() },
      { role: "manager", pin: "5678", updatedAt: new Date().toISOString() },
    ]);
    console.log("[Offline PIN] Seeded default development PINs");
  }
}

// Get all cached PINs (for debugging)
export async function getCachedPins(): Promise<Pin[]> {
  return await db.pins.toArray();
}
