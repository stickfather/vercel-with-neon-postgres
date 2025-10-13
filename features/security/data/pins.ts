import { promisify } from "util";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";

import { getSqlClient, normalizeRows, type SqlRow } from "@/lib/db/client";
import type { PinScope } from "@/lib/security/pin-session";

const scrypt = promisify(scryptCallback);

export type PinStatus = {
  scope: PinScope;
  isSet: boolean;
  updatedAt: string | null;
};

const VALID_SCOPES: PinScope[] = ["staff", "management"];

function normalizeScope(scope: PinScope): PinScope {
  return scope === "management" ? "management" : "staff";
}

async function ensureTable() {
  const sql = getSqlClient();
  await sql`
    CREATE TABLE IF NOT EXISTS security_pins (
      scope text PRIMARY KEY,
      pin_hash text,
      updated_at timestamptz DEFAULT now()
    )
  `;
}

async function fetchPinRow(scope: PinScope): Promise<SqlRow | undefined> {
  const sql = getSqlClient();
  const rows = normalizeRows<SqlRow>(await sql`
    SELECT scope, pin_hash, updated_at
    FROM security_pins
    WHERE scope = ${normalizeScope(scope)}
    LIMIT 1
  `);
  return rows[0];
}

function parseStatus(scope: PinScope, row?: SqlRow): PinStatus {
  const isSet = Boolean(
    row && typeof row.pin_hash === "string" && row.pin_hash.trim().length > 0,
  );
  const updatedAtValue = row?.updated_at;
  const updatedAt =
    updatedAtValue instanceof Date
      ? updatedAtValue.toISOString()
      : typeof updatedAtValue === "string"
        ? updatedAtValue
        : null;

  return { scope, isSet, updatedAt };
}

async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(pin, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

async function verifyHash(pin: string, hash: string): Promise<boolean> {
  const [method, salt, digest] = hash.split(":");
  if (method !== "scrypt" || !salt || !digest) {
    return false;
  }

  const derived = (await scrypt(pin, salt, 64)) as Buffer;
  const expected = Buffer.from(digest, "hex");
  if (expected.length !== derived.length) {
    return false;
  }
  return timingSafeEqual(derived, expected);
}

function sanitizePin(pin: string): string {
  const trimmed = pin.trim();
  if (!/^\d{4,8}$/.test(trimmed)) {
    throw new Error("El PIN debe tener entre 4 y 8 dígitos numéricos.");
  }
  return trimmed;
}

export async function getSecurityPinStatuses(): Promise<PinStatus[]> {
  await ensureTable();
  const sql = getSqlClient();
  const rows = normalizeRows<SqlRow>(await sql`
    SELECT scope, pin_hash, updated_at
    FROM security_pins
  `);

  const byScope = new Map<string, SqlRow>();
  rows.forEach((row) => {
    if (typeof row.scope === "string") {
      byScope.set(row.scope.trim().toLowerCase(), row);
    }
  });

  return VALID_SCOPES.map((scope) => parseStatus(scope, byScope.get(scope)));
}

export async function isSecurityPinEnabled(scope: PinScope): Promise<boolean> {
  await ensureTable();
  const row = await fetchPinRow(scope);
  return Boolean(row && typeof row.pin_hash === "string" && row.pin_hash.trim().length > 0);
}

export async function verifySecurityPin(
  scope: PinScope,
  pin: string,
): Promise<boolean> {
  await ensureTable();
  const row = await fetchPinRow(scope);
  if (!row) {
    return false;
  }
  const hashValue = typeof row.pin_hash === "string" ? row.pin_hash.trim() : "";
  if (!hashValue) {
    return false;
  }
  try {
    return await verifyHash(pin, hashValue);
  } catch (error) {
    console.error("Fallo al verificar PIN", error);
    return false;
  }
}

export async function updateSecurityPin(scope: PinScope, pin: string): Promise<PinStatus> {
  await ensureTable();
  const sanitizedPin = sanitizePin(pin);
  const hashed = await hashPin(sanitizedPin);
  const sql = getSqlClient();

  await sql`
    INSERT INTO security_pins (scope, pin_hash, updated_at)
    VALUES (${normalizeScope(scope)}, ${hashed}, now())
    ON CONFLICT (scope)
    DO UPDATE SET pin_hash = EXCLUDED.pin_hash, updated_at = now()
  `;

  const row = await fetchPinRow(scope);
  return parseStatus(scope, row);
}
