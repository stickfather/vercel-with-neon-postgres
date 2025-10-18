import { NextResponse } from "next/server";

import { verifySecurityPin } from "@/features/security/data/pins";
import { issueManagerToken } from "@/lib/security/manager-auth";
import { setPinSession } from "@/lib/security/pin-session";

const RATE_LIMIT_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

const attempts = new Map<string, { count: number; expiresAt: number }>();

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

function getAttemptKey(ip: string): string {
  return `manager-pin:${ip}`;
}

function getAttemptState(key: string): { count: number; expiresAt: number } {
  const current = attempts.get(key);
  if (current && current.expiresAt > Date.now()) {
    return current;
  }
  const next = { count: 0, expiresAt: Date.now() + RATE_LIMIT_WINDOW_MS };
  attempts.set(key, next);
  return next;
}

function registerAttempt(key: string): number {
  const state = getAttemptState(key);
  state.count += 1;
  attempts.set(key, state);
  return state.count;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type ManagerPinPayload = {
  pin?: string;
};

export async function POST(request: Request) {
  let body: ManagerPinPayload;
  try {
    body = (await request.json()) as ManagerPinPayload;
  } catch (error) {
    return NextResponse.json(
      { error: "No pudimos leer los datos enviados." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const pin = typeof body?.pin === "string" ? body.pin.trim() : "";

  if (!pin.length) {
    return NextResponse.json(
      { error: "Debes indicar el PIN de gerencia." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const ip = getClientIp(request);
  const key = getAttemptKey(ip);
  const state = getAttemptState(key);

  if (state.count >= RATE_LIMIT_ATTEMPTS && state.expiresAt > Date.now()) {
    registerAttempt(key);
    return NextResponse.json(
      { error: "Demasiados intentos. Inténtalo más tarde." },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  const isValid = await verifySecurityPin("manager", pin);
  const attemptsCount = registerAttempt(key);

  if (!isValid) {
    if (attemptsCount >= RATE_LIMIT_ATTEMPTS) {
      attempts.set(key, { count: attemptsCount, expiresAt: Date.now() + RATE_LIMIT_WINDOW_MS });
    }
    return NextResponse.json(
      { error: "PIN incorrecto." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  attempts.delete(key);

  const { token, expiresIn, expiresAt } = issueManagerToken();
  await setPinSession("manager", Math.ceil(expiresIn / 60));

  return NextResponse.json(
    { token, role: "manager", expires_in: expiresIn, expires_at: expiresAt },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
