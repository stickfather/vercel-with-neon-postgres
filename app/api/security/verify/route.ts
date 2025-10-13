import { NextResponse } from "next/server.js";

import { verifySecurityPin } from "@/features/security/data/pins";
import { getSqlClient, normalizeRows, type SqlRow } from "@/lib/db/client";
import { setPinSession, type PinScope } from "@/lib/security/pin-session";

const RATE_LIMIT_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MINUTES = 10;

function resolveType(value: unknown): PinScope | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "manager") return "manager";
  if (normalized === "staff") return "staff";
  return null;
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const [first] = forwarded.split(",");
    if (first) return first.trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

async function ensureAuditTable() {
  const sql = getSqlClient();
  await sql`
    CREATE TABLE IF NOT EXISTS pin_audit_log (
      id bigserial PRIMARY KEY,
      event text NOT NULL,
      ok boolean NOT NULL,
      staff_id bigint,
      ip text,
      created_at timestamptz DEFAULT now()
    )
  `;
}

async function getRecentAttempts(event: string, ip: string): Promise<number> {
  const sql = getSqlClient();
  const rows = normalizeRows<SqlRow>(await sql`
    SELECT COUNT(*)::int AS attempts
    FROM pin_audit_log
    WHERE event = ${event}
      AND ip = ${ip}
      AND created_at >= NOW() - INTERVAL '${RATE_LIMIT_WINDOW_MINUTES} minutes'
  `);
  const attempts = Number(rows[0]?.attempts ?? 0);
  return Number.isFinite(attempts) ? attempts : 0;
}

async function logAttempt(event: string, ok: boolean, ip: string) {
  const sql = getSqlClient();
  await sql`
    INSERT INTO pin_audit_log (event, ok, staff_id, ip)
    VALUES (${event}, ${ok}, ${null}, ${ip})
  `;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type VerifyBody = {
  type?: string;
  pin?: string;
};

export async function POST(request: Request) {
  let payload: VerifyBody;
  try {
    payload = (await request.json()) as VerifyBody;
  } catch (error) {
    console.error("No se pudo leer el cuerpo de la solicitud", error);
    return NextResponse.json(
      { valid: false, error: "No pudimos leer los datos enviados." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const type = resolveType(payload?.type);
  const pin = typeof payload?.pin === "string" ? payload.pin.trim() : "";

  if (!type || !pin) {
    return NextResponse.json(
      { valid: false, error: "Debes indicar el tipo de PIN y su valor." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const event = `verify:${type}`;
  const ip = getClientIp(request);

  await ensureAuditTable();

  const attempts = await getRecentAttempts(event, ip);
  if (attempts >= RATE_LIMIT_ATTEMPTS) {
    await logAttempt(event, false, ip);
    return NextResponse.json(
      { valid: false, error: "Demasiados intentos. Inténtalo más tarde." },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  const isValid = await verifySecurityPin(type, pin);
  await logAttempt(event, isValid, ip);

  if (!isValid) {
    return NextResponse.json(
      { valid: false, error: "PIN incorrecto." },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  const ttlMinutes = type === "manager" ? 10 : undefined;
  await setPinSession(type, ttlMinutes);

  return NextResponse.json(
    { valid: true },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
