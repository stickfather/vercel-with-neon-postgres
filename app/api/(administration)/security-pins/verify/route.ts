import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  setPinSession,
  type PinScope,
} from "@/lib/security/pin-session";
import { verifySecurityPin } from "@/features/security/data/pins";

type VerifyRequest = {
  scope?: string;
  pin?: string;
};

const ATTEMPT_COOKIE_PREFIX = "ir_pin_attempts_";
const FAILURE_LOCK_WINDOWS_MS = [0, 0, 15_000, 60_000, 300_000];

type AttemptState = {
  failCount: number;
  lockedUntil: number;
};

function getAttemptCookieName(scope: PinScope): string {
  return `${ATTEMPT_COOKIE_PREFIX}${scope}`;
}

function decodeAttemptValue(value: string | null | undefined): AttemptState {
  if (!value) {
    return { failCount: 0, lockedUntil: 0 };
  }

  const [failCountRaw, lockedUntilRaw] = value.split(":");
  const failCount = Number(failCountRaw);
  const lockedUntil = Number(lockedUntilRaw);

  return {
    failCount: Number.isFinite(failCount) && failCount > 0 ? failCount : 0,
    lockedUntil: Number.isFinite(lockedUntil) && lockedUntil > 0 ? lockedUntil : 0,
  };
}

async function readAttemptState(scope: PinScope): Promise<AttemptState> {
  const store = await cookies();
  const cookie = store.get(getAttemptCookieName(scope));
  return decodeAttemptValue(cookie?.value ?? null);
}

async function writeAttemptState(scope: PinScope, state: AttemptState): Promise<void> {
  const store = await cookies();
  const cookieName = getAttemptCookieName(scope);
  if (!state.failCount) {
    store.delete(cookieName);
    return;
  }

  const secure = process.env.NODE_ENV === "production";
  const ttl = Math.max(state.lockedUntil, Date.now() + 60 * 60 * 1000);
  store.set(cookieName, `${state.failCount}:${state.lockedUntil || 0}`, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    expires: new Date(ttl),
    path: "/",
  });
}

function computeLockDuration(failCount: number): number {
  const index = Math.min(
    Math.max(failCount, 0),
    FAILURE_LOCK_WINDOWS_MS.length - 1,
  );
  return FAILURE_LOCK_WINDOWS_MS[index];
}

function toScope(value: string | undefined): PinScope | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "staff") return "staff";
  if (normalized === "management") return "management";
  return null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as VerifyRequest;
  const scope = toScope(body.scope);
  const pin = typeof body.pin === "string" ? body.pin : "";

  if (!scope || !pin.trim()) {
    return NextResponse.json(
      { error: "Se requiere el alcance y el PIN para continuar." },
      { status: 400 },
    );
  }

  const attemptState = await readAttemptState(scope);
  if (attemptState.lockedUntil && attemptState.lockedUntil > Date.now()) {
    return NextResponse.json(
      { error: "Demasiados intentos. Inténtalo más tarde." },
      { status: 429 },
    );
  }

  const isValid = await verifySecurityPin(scope, pin.trim());
  if (!isValid) {
    const nextFailCount = attemptState.failCount + 1;
    const lockDuration = computeLockDuration(nextFailCount);
    const lockedUntil = lockDuration ? Date.now() + lockDuration : 0;
    await writeAttemptState(scope, {
      failCount: nextFailCount,
      lockedUntil,
    });

    return NextResponse.json({ error: "PIN incorrecto." }, { status: 401 });
  }

  await writeAttemptState(scope, { failCount: 0, lockedUntil: 0 });

  const ttlMinutes = scope === "management" ? 10 : undefined;
  await setPinSession(scope, ttlMinutes);

  return NextResponse.json({ ok: true });
}
