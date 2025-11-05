import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/pins
 * 
 * Returns plaintext PINs for offline caching
 * 
 * SECURITY WARNING: This endpoint returns PINs in plaintext.
 * This is INTENTIONALLY INSECURE for offline-first mode as per requirements.
 * 
 * Set environment variables:
 * - OFFLINE_STAFF_PIN (default: "1234")
 * - OFFLINE_MANAGER_PIN (default: "5678")
 * 
 * These should match the actual PINs stored (hashed) in the database.
 */
export async function GET() {
  try {
    // Get PINs from environment variables (plaintext for offline use)
    // These MUST match the actual PINs that are hashed in the database
    const staffPin = process.env.OFFLINE_STAFF_PIN || "1234";
    const managerPin = process.env.OFFLINE_MANAGER_PIN || "5678";
    
    const pins = [
      { role: "staff", pin: staffPin, updatedAt: new Date().toISOString() },
      { role: "manager", pin: managerPin, updatedAt: new Date().toISOString() },
    ];
    
    console.log("[API /pins] Returning PINs for offline caching (lengths):", {
      staff: staffPin.length,
      manager: managerPin.length,
    });
    
    return NextResponse.json(pins);
  } catch (error) {
    console.error("Failed to get PINs:", error);
    
    // Return default PINs on error
    return NextResponse.json([
      { role: "staff", pin: process.env.OFFLINE_STAFF_PIN || "1234", updatedAt: new Date().toISOString() },
      { role: "manager", pin: process.env.OFFLINE_MANAGER_PIN || "5678", updatedAt: new Date().toISOString() },
    ]);
  }
}
