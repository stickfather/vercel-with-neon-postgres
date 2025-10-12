import { promisify } from "util";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";

import {
  getSqlClient,
  normalizeRows,
  SqlRow,
} from "@/lib/db/client";
import type { PinScope } from "@/lib/security/pin-session";

const scrypt = promisify(scryptCallback);

export type PinStatus = {
  scope: PinScope;
  isSet: boolean;
  updatedAt: string | null;
};

function normalizeScope(scope: PinScope): string {
  return scope === "management" ? "management" : "staff";
}

async function ensurePinsTable() {
  const sql = getSqlClient();
  await sql`
    CREATE TABLE IF NOT EXISTS security_pins (
      scope text PRIMARY KEY,
      pin_hash text,
      updated_at timestamptz DEFAULT now()
    )
  `;
}

function parseStatusRow(scope: PinScope, row?: SqlRow): PinStatus {
  const updatedAt = row?.updated_at ?? row?.updatedAt ?? null;
  return {
    scope,
    isSet: Boolean(row?.pin_hash ?? row?.pinHash),
    updatedAt: updatedAt ? String(updatedAt) : null,
  };
}

export async function getSecurityPinStatuses(): Promise<PinStatus[]> {
  await ensurePinsTable();
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT scope, pin_hash, updated_at
    FROM security_pins
    WHERE scope IN ('staff', 'management')
  `);

  const byScope = new Map<string, SqlRow>();
  rows.forEach((row) => {
    const scopeValue = String(row.scope ?? "").toLowerCase();
    byScope.set(scopeValue, row);
  });

  return ["staff", "management"].map((scope) =>
    parseStatusRow(scope as PinScope, byScope.get(scope)),
  );
}

export async function isSecurityPinEnabled(scope: PinScope): Promise<boolean> {
  await ensurePinsTable();
  const sql = getSqlClient();
  const normalizedScope = normalizeScope(scope);

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT *
    FROM security_pins
    WHERE scope = ${normalizedScope}
    LIMIT 1
  `);

  if (!rows.length) {
    return false;
  }

  const row = (rows[0] ?? {}) as SqlRow;
  const candidateKeys = ["pin_hash", "pinHash", "pinhash"] as const;

  for (const key of candidateKeys) {
    const value = row[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return true;
    }
  }

  return false;
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

export async function verifySecurityPin(scope: PinScope, pin: string): Promise<boolean> {
  await ensurePinsTable();
  const sql = getSqlClient();
  const normalizedScope = normalizeScope(scope);

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT pin_hash
    FROM security_pins
    WHERE scope = ${normalizedScope}
    LIMIT 1
  `);

  if (!rows.length) return false;
  const hash = rows[0].pin_hash as string | null;
  if (!hash) return false;

  try {
    return await verifyHash(pin, hash);
  } catch (error) {
    console.error("Fallo al verificar PIN", error);
    return false;
  }
}

export async function updateSecurityPin(scope: PinScope, pin: string): Promise<PinStatus> {
  await ensurePinsTable();
  const sql = getSqlClient();
  const normalizedScope = normalizeScope(scope);
  const normalizedPin = sanitizePin(pin);
  const hashed = await hashPin(normalizedPin);

  const rows = normalizeRows<SqlRow>(await sql`
    INSERT INTO security_pins (scope, pin_hash, updated_at)
    VALUES (${normalizedScope}, ${hashed}, now())
    ON CONFLICT (scope)
    DO UPDATE SET pin_hash = EXCLUDED.pin_hash, updated_at = now()
    RETURNING scope, pin_hash, updated_at
  `);

  return parseStatusRow(scope, rows[0]);
}
