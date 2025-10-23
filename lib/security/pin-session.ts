import { cookies } from "next/headers.js";
import { createHmac, randomBytes } from "crypto";

import { env } from "@/src/config/env";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

async function resolveCookies(): Promise<CookieStore> {
  return (await cookies()) as CookieStore;
}

function readCookie(
  store: CookieStore,
  name: string,
): ReturnType<Exclude<CookieStore["get"], undefined>> | undefined {
  const getter = (store as { get?: CookieStore["get"] }).get;
  if (typeof getter === "function") {
    return getter.call(store, name) as ReturnType<
      Exclude<CookieStore["get"], undefined>
    >;
  }
  return undefined;
}

function deleteCookie(store: CookieStore, name: string) {
  if (
    typeof (store as { delete?: (name: string) => void }).delete === "function"
  ) {
    (store as { delete: (name: string) => void }).delete(name);
  }
}

function setCookie(
  store: CookieStore,
  name: string,
  value: string,
  options: {
    httpOnly: boolean;
    sameSite: "lax" | "strict" | "none";
    secure: boolean;
    expires: Date;
    path: string;
  },
) {
  if (typeof (store as { set?: CookieStore["set"] }).set === "function") {
    (store as { set: CookieStore["set"] }).set(name, value, options);
    return;
  }
  throw new Error(
    "No se puede establecer la cookie de sesión del PIN en este contexto.",
  );
}

export type PinScope = "staff" | "manager";

const COOKIE_NAMES: Record<PinScope, string> = {
  staff: "ir_pin_staff",
  manager: "ir_pin_management",
};

// Sessions are single-use, but we keep a short TTL as a safety net in case the
// follow-up request is delayed by the network. The cookie is cleared on the
// first successful validation.
const SESSION_TTL_MINUTES = 1;

function getSessionSecret(): string {
  const secret =
    env.pinSessionSecret ??
    env.sessionMaintenanceToken ??
    env.databaseUrl ??
    "ingresorapido-dev-pin";
  return secret;
}

function signPayload(payload: string): string {
  const secret = getSessionSecret();
  const hmac = createHmac("sha256", secret);
  hmac.update(payload);
  return hmac.digest("hex");
}

function encodeSession(scope: PinScope, expiresAt: Date): string {
  const payload = `${scope}|${expiresAt.toISOString()}|${randomBytes(8).toString("hex")}`;
  const signature = signPayload(payload);
  return Buffer.from(`${payload}|${signature}`).toString("base64url");
}

function decodeSession(value: string): {
  scope: PinScope | null;
  expiresAt: Date | null;
  valid: boolean;
} {
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const [scopeRaw, expiresRaw, nonce, signature] = decoded.split("|");
    if (!scopeRaw || !expiresRaw || !nonce || !signature) {
      return { scope: null, expiresAt: null, valid: false };
    }
    if (signPayload(`${scopeRaw}|${expiresRaw}|${nonce}`) !== signature) {
      return { scope: null, expiresAt: null, valid: false };
    }
    if (scopeRaw !== "staff" && scopeRaw !== "manager") {
      return { scope: null, expiresAt: null, valid: false };
    }
    const expiresAt = new Date(expiresRaw);
    if (Number.isNaN(expiresAt.getTime())) {
      return { scope: null, expiresAt: null, valid: false };
    }
    return { scope: scopeRaw, expiresAt, valid: true };
  } catch (error) {
    return { scope: null, expiresAt: null, valid: false };
  }
}

async function checkPinSession(scope: PinScope): Promise<boolean> {
  const cookieName = COOKIE_NAMES[scope];
  const store = await resolveCookies();
  const stored = readCookie(store, cookieName);
  if (!stored?.value) return false;
  const decoded = decodeSession(stored.value);
  const isValidSession =
    decoded.valid &&
    decoded.scope === scope &&
    decoded.expiresAt != null &&
    decoded.expiresAt.getTime() > Date.now();

  deleteCookie(store, cookieName);

  return isValidSession;
}

export let hasValidPinSession: (scope: PinScope) => Promise<boolean> =
  checkPinSession;

export async function setPinSession(
  scope: PinScope,
  ttlMinutes = SESSION_TTL_MINUTES,
) {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  const value = encodeSession(scope, expiresAt);
  const secure = env.nodeEnv === "production";
  const cookieName = COOKIE_NAMES[scope];

  const store = await resolveCookies();
  setCookie(store, cookieName, value, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    expires: expiresAt,
    path: "/",
  });
}

export async function clearPinSession(scope: PinScope) {
  const cookieName = COOKIE_NAMES[scope];
  const store = await resolveCookies();
  deleteCookie(store, cookieName);
}

export function __setHasValidPinSessionForTests(
  fn: (scope: PinScope) => Promise<boolean>,
) {
  hasValidPinSession = fn;
}

export function __resetHasValidPinSessionForTests() {
  hasValidPinSession = checkPinSession;
}
