import { NextResponse } from "next/server";

import { runScheduledAutoCheckout } from "@/features/session-maintenance/auto-checkout";

function isAuthorized(request: Request): boolean {
  const expectedToken = process.env.SESSION_MAINTENANCE_TOKEN;
  if (!expectedToken) return true;

  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;
  const [, token] = authHeader.split(" ");
  return token === expectedToken;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const url = new URL(request.url);
  const forceParam = url.searchParams.get("force");
  const force = forceParam === "1" || forceParam?.toLowerCase() === "true";

  try {
    const summary = await runScheduledAutoCheckout({ force });
    const statusCode = summary.status === "error" ? 500 : 200;
    return NextResponse.json(summary, { status: statusCode });
  } catch (error) {
    console.error("Auto-checkout diario falló", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo completar el cierre automático.";
    return NextResponse.json({ status: "error", error: message }, { status: 500 });
  }
}
