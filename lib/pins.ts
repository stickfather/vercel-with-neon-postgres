"use client";

import { db, type Pin } from "@/lib/db";

// Validate PIN offline (plaintext comparison)
// SIMPLE OVERRIDE: Staff PIN accepts "9999" when offline (universal master override)
export async function validatePinOffline(role: string, inputPin: string): Promise<boolean> {
  try {
    console.log(`[Offline PIN] Attempting to validate PIN for role: ${role}`);
    
    const trimmedPin = inputPin.trim();
    
    // STAFF ONLY: Accept universal offline master override "9999"
    if (role === "staff" && trimmedPin === "9999") {
      console.log(`[Offline PIN] Staff universal offline master override accepted: 9999`);
      return true;
    }
    
    // For manager or if staff entered something other than 9999, check cached PIN
    const allPins = await db.pins.toArray();
    console.log(`[Offline PIN] All cached PINs:`, allPins.map(p => ({ role: p.role, hasPin: !!p.pin })));
    
    const pin = await db.pins.get(role);
    
    if (!pin) {
      console.log(`[Offline PIN] No cached PIN found for role: ${role}`);
      return false;
    }
    
    console.log(`[Offline PIN] Found cached PIN for ${role}, comparing...`);
    const isValid = pin.pin === trimmedPin;
    console.log(`[Offline PIN] Validation for ${role}: ${isValid ? 'SUCCESS' : 'FAILED'}`);
    return isValid;
  } catch (error) {
    console.error("[Offline PIN] Error during validation:", error);
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
  try {
    const existingPins = await db.pins.toArray();
    
    console.log("[Offline PIN] Seeding check - existing PINs:", existingPins.length);
    
    if (existingPins.length === 0) {
      // Development defaults - DO NOT use in production
      // Note: Staff has offline master override 9999, these are just for online validation
      const defaultPins = [
        { role: "staff", pin: "1234", updatedAt: new Date().toISOString() },
        { role: "manager", pin: "5678", updatedAt: new Date().toISOString() },
      ];
      
      await db.pins.bulkPut(defaultPins);
      console.log("[Offline PIN] Seeded default development PINs:", defaultPins.map(p => p.role));
      
      // Verify seeding
      const verifyPins = await db.pins.toArray();
      console.log("[Offline PIN] Verification after seeding:", verifyPins.map(p => ({ 
        role: p.role, 
        hasPin: !!p.pin 
      })));
    } else {
      console.log("[Offline PIN] PINs already exist, skipping seed");
    }
  } catch (error) {
    console.error("[Offline PIN] Failed to seed default PINs:", error);
  }
}

// Get all cached PINs (for debugging)
export async function getCachedPins(): Promise<Pin[]> {
  return await db.pins.toArray();
}
