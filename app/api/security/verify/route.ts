import { NextResponse } from "next/server.js";

import { verifySecurityPin } from "@/features/security/data/pins";
import {
  clearPinSession,
  setPinSession,
  type PinScope,
} from "@/lib/security/pin-session";

const RATE_LIMIT_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

const attemptStore = new Map<string, { count: number; expiresAt: number }>();

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

function getAttemptKey(event: string, ip: string): string {
  return `${event}:${ip}`;
}

function getAttemptState(key: string): { count: number; expiresAt: number } {
  const existing = attemptStore.get(key);
  if (existing && existing.expiresAt > Date.now()) {
    return existing;
  }
  const next = { count: 0, expiresAt: Date.now() + RATE_LIMIT_WINDOW_MS };
  attemptStore.set(key, next);
  return next;
}

function incrementAttempts(key: string): number {
  const state = getAttemptState(key);
  state.count += 1;
  attemptStore.set(key, state);
  return state.count;
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
  const key = getAttemptKey(event, ip);
  const state = getAttemptState(key);

  if (state.count >= RATE_LIMIT_ATTEMPTS && state.expiresAt > Date.now()) {
    incrementAttempts(key);
    return NextResponse.json(
      { valid: false, error: "Demasiados intentos. Inténtalo más tarde." },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  const isValid = await verifySecurityPin(type, pin);
  const attempts = incrementAttempts(key);

  if (!isValid) {
    if (attempts >= RATE_LIMIT_ATTEMPTS) {
      attemptStore.set(key, { count: attempts, expiresAt: Date.now() + RATE_LIMIT_WINDOW_MS });
    }
    return NextResponse.json(
      { valid: false, error: "PIN incorrecto." },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  attemptStore.delete(key);

  if (type === "manager") {
    const ttlMinutes = 10;
    await setPinSession("manager", ttlMinutes);
  } else {
    await clearPinSession("staff");
  }

  return NextResponse.json(
    { valid: true },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
