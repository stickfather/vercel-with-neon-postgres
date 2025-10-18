import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

function getManagerTokenSecret(): string {
  return (
    process.env.MANAGER_TOKEN_SECRET ??
    process.env.PIN_SESSION_SECRET ??
    process.env.SESSION_MAINTENANCE_TOKEN ??
    process.env.DATABASE_URL ??
    "ingresorapido-dev-pin"
  );
}

function sign(encodedPayload: string): string {
  const secret = getManagerTokenSecret();
  const hmac = createHmac("sha256", secret);
  hmac.update(encodedPayload);
  return hmac.digest("base64url");
}

export type ManagerTokenIssue = {
  token: string;
  expiresIn: number;
  expiresAt: number;
};

export function issueManagerToken(ttlSeconds = TOKEN_TTL_SECONDS): ManagerTokenIssue {
  const nonce = randomBytes(16).toString("hex");
  const expiresAtSeconds = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = JSON.stringify({ scope: "manager", exp: expiresAtSeconds, n: nonce });
  const encodedPayload = Buffer.from(payload, "utf8").toString("base64url");
  const signature = sign(encodedPayload);
  return {
    token: `${encodedPayload}.${signature}`,
    expiresIn: ttlSeconds,
    expiresAt: expiresAtSeconds,
  };
}

export type ManagerTokenValidation = {
  valid: boolean;
  expiresAt: number | null;
};

export function verifyManagerToken(token: string | null | undefined): ManagerTokenValidation {
  if (!token) {
    return { valid: false, expiresAt: null };
  }

  try {
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) {
      return { valid: false, expiresAt: null };
    }

    const expectedSignature = sign(encodedPayload);
    const provided = Buffer.from(signature, "base64url");
    const expected = Buffer.from(expectedSignature, "base64url");

    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return { valid: false, expiresAt: null };
    }

    const payloadJson = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson) as { scope?: string; exp?: number };

    if (payload.scope !== "manager" || typeof payload.exp !== "number") {
      return { valid: false, expiresAt: null };
    }

    if (payload.exp * 1000 <= Date.now()) {
      return { valid: false, expiresAt: null };
    }

    return { valid: true, expiresAt: payload.exp };
  } catch (error) {
    return { valid: false, expiresAt: null };
  }
}

export function getManagerTokenFromRequest(request: Request): string | null {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1]?.trim();
  return token?.length ? token : null;
}

export function isManagerAuthorized(request: Request): boolean {
  const token = getManagerTokenFromRequest(request);
  return verifyManagerToken(token).valid;
}
