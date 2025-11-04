import { NextResponse } from "next/server";
import { getStaffDirectory } from "@/features/staff/data/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Get all active staff members, matching the shape and order used in the UI
    const staff = await getStaffDirectory();
    
    return NextResponse.json({ 
      staff,
      version: 1,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching staff cache snapshot", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo obtener la lista del personal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
