import { cookies } from "next/headers";
import { createHmac, randomBytes } from "crypto";

export type PinScope = "staff" | "management";

const COOKIE_NAMES: Record<PinScope, string> = {
  staff: "ir_pin_staff",
  management: "ir_pin_management",
};

const SESSION_TTL_MINUTES = 30;

function getSessionSecret(): string {
  const secret =
    process.env.PIN_SESSION_SECRET ??
    process.env.SESSION_MAINTENANCE_TOKEN ??
    process.env.DATABASE_URL ??
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
    if (scopeRaw !== "staff" && scopeRaw !== "management") {
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

export function hasValidPinSession(scope: PinScope): boolean {
  const cookieName = COOKIE_NAMES[scope];
  const stored = cookies().get(cookieName);
  if (!stored?.value) return false;
  const decoded = decodeSession(stored.value);
  if (!decoded.valid || decoded.scope !== scope) {
    cookies().delete(cookieName);
    return false;
  }
  if (!decoded.expiresAt || decoded.expiresAt.getTime() <= Date.now()) {
    cookies().delete(cookieName);
    return false;
  }
  return true;
}

export function setPinSession(scope: PinScope, ttlMinutes = SESSION_TTL_MINUTES) {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  const value = encodeSession(scope, expiresAt);
  const secure = process.env.NODE_ENV === "production";
  const cookieName = COOKIE_NAMES[scope];

  cookies().set(cookieName, value, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    expires: expiresAt,
    path: "/",
  });
}

export function clearPinSession(scope: PinScope) {
  const cookieName = COOKIE_NAMES[scope];
  cookies().delete(cookieName);
}
