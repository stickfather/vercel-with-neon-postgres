import { NextResponse } from "next/server.js";
import {
  closeExpiredSessions,
  closeExpiredStaffSessions,
  getSqlClient,
} from "@/lib/db/client";
import { env } from "@/src/config/env";

function isAuthorized(request: Request): boolean {
  const expectedToken = env.sessionMaintenanceToken;
  if (!expectedToken) {
    return true;
  }

  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return false;
  }

  const [, token] = authorization.split(" ");
  return token === expectedToken;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const sql = getSqlClient();
    await Promise.all([
      closeExpiredSessions(sql),
      closeExpiredStaffSessions(sql),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error al cerrar sesiones expiradas", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron cerrar las sesiones expiradas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
