"use client";

import { db, type Pin } from "@/lib/db";

// Validate PIN offline (plaintext comparison)
export async function validatePinOffline(role: string, inputPin: string): Promise<boolean> {
  try {
    const pin = await db.pins.get(role);
    
    if (!pin) {
      return false;
    }
    
    return pin.pin === inputPin.trim();
  } catch (error) {
    console.error("Failed to validate PIN offline", error);
    return false;
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
    }
  } catch (error) {
    console.error("Failed to sync PINs", error);
  }
}

// Seed default PINs for development (if none exist)
export async function seedDefaultPins(): Promise<void> {
  const existingPins = await db.pins.toArray();
  
  if (existingPins.length === 0) {
    await db.pins.bulkPut([
      { role: "staff", pin: "1234", updatedAt: new Date().toISOString() },
      { role: "manager", pin: "5678", updatedAt: new Date().toISOString() },
    ]);
  }
}

// Get all cached PINs (for debugging)
export async function getCachedPins(): Promise<Pin[]> {
  return await db.pins.toArray();
}
