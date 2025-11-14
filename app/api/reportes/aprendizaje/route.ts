import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      error:
        "Este endpoint fue reemplazado por /api/reports/learning. Actualiza tus integraciones para continuar.",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
