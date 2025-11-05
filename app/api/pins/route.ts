import { NextResponse } from "next/server";
import { getSecurityPinStatuses } from "@/features/security/data/pins";
import { getSqlClient } from "@/lib/db/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/pins
 * 
 * Returns plaintext PINs for offline caching
 * WARNING: This is intentionally insecure for offline-first mode
 */
export async function GET() {
  try {
    const sql = getSqlClient();
    const pinStatuses = await getSecurityPinStatuses(sql);
    
    // Return placeholder PINs for roles that have PINs set
    // In a real implementation, you would fetch actual PINs
    // For this offline-simple mode, we use hardcoded defaults
    const pins = [];
    
    for (const status of pinStatuses) {
      if (status.isSet) {
        // WARNING: Returning plaintext PINs - only for offline mode
        // In production, you would need proper authentication
        pins.push({
          role: status.scope,
          pin: status.scope === "staff" ? "1234" : "5678",
          updatedAt: status.updatedAt || new Date().toISOString(),
        });
      }
    }
    
    // If no PINs are set, return defaults for development
    if (pins.length === 0) {
      pins.push(
        { role: "staff", pin: "1234", updatedAt: new Date().toISOString() },
        { role: "manager", pin: "5678", updatedAt: new Date().toISOString() }
      );
    }
    
    return NextResponse.json(pins);
  } catch (error) {
    console.error("Failed to get PINs:", error);
    
    // Return default PINs on error
    return NextResponse.json([
      { role: "staff", pin: "1234", updatedAt: new Date().toISOString() },
      { role: "manager", pin: "5678", updatedAt: new Date().toISOString() },
    ]);
  }
}
