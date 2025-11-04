import { NextResponse } from "next/server";
import { hasValidPinSession, type PinScope } from "@/lib/security/pin-session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const scope = body.scope as PinScope | undefined;

    if (!scope || (scope !== "staff" && scope !== "manager")) {
      return NextResponse.json(
        { authorized: false, error: "Invalid scope" },
        { status: 400 }
      );
    }

    const authorized = await hasValidPinSession(scope);

    return NextResponse.json({ authorized });
  } catch (error) {
    console.error("Error checking PIN session", error);
    return NextResponse.json(
      { authorized: false, error: "Session check failed" },
      { status: 500 }
    );
  }
}
