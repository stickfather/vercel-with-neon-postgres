import { getSqlClient, normalizeRows, type SqlRow } from "@/lib/db/client";
import type { PinScope } from "@/lib/security/pin-session";

export type PinStatus = {
  scope: PinScope;
  isSet: boolean;
  updatedAt: string | null;
};

export type SecurityPinsSummary = {
  hasManager: boolean;
  hasStaff: boolean;
  updatedAt: string | null;
};

const PIN_ROW_ID = 1;

const COLUMN_BY_SCOPE: Record<PinScope, "manager_pin_hash" | "staff_pin_hash"> = {
  staff: "staff_pin_hash",
  manager: "manager_pin_hash",
};

type PinsRow = {
  manager_pin_hash: string | null;
  staff_pin_hash: string | null;
  updated_at: Date | string | null;
};

function sanitizePin(pin: string): string {
  const trimmed = pin.trim();
  if (!/^\d{4,8}$/.test(trimmed)) {
    throw new Error("El PIN debe tener entre 4 y 8 dígitos numéricos.");
  }
  return trimmed;
}

async function ensurePgcrypto(sql = getSqlClient()) {
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
  } catch (error) {
    console.error("No se pudo asegurar la extensión pgcrypto", error);
    throw new Error("No se pudo preparar el almacenamiento seguro de PIN.");
  }
}

async function hashPin(pin: string): Promise<string> {
  await ensurePgcrypto();
  const sql = getSqlClient();
  const rows = normalizeRows<SqlRow>(await sql`
    SELECT crypt(${pin}, gen_salt('bf', 12)) AS hash
  `);
  const hash = rows[0]?.hash;
  if (typeof hash !== "string" || !hash.trim()) {
    throw new Error("No se pudo generar el hash del PIN.");
  }
  return hash;
}

async function verifyHash(pin: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) return false;
  await ensurePgcrypto();
  const sql = getSqlClient();
  const rows = normalizeRows<SqlRow>(await sql`
    SELECT crypt(${pin}, ${hash}) = ${hash} AS ok
  `);
  return rows[0]?.ok === true;
}

function parseUpdatedAt(value: Date | string | null | undefined): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}

async function ensureStorage() {
  const sql = getSqlClient();
  await ensurePgcrypto(sql);
  await sql`
    CREATE TABLE IF NOT EXISTS security_pins (
      id bigserial PRIMARY KEY,
      manager_pin_hash text,
      staff_pin_hash text,
      updated_at timestamptz DEFAULT now()
    )
  `;
  await sql`ALTER TABLE security_pins ALTER COLUMN manager_pin_hash DROP NOT NULL`;
  await sql`ALTER TABLE security_pins ALTER COLUMN staff_pin_hash DROP NOT NULL`;
  await sql`INSERT INTO security_pins (id) VALUES (${PIN_ROW_ID}) ON CONFLICT (id) DO NOTHING`;
  await sql`DELETE FROM security_pins WHERE id <> ${PIN_ROW_ID}`;
}

async function fetchPinsRow(): Promise<PinsRow> {
  const sql = getSqlClient();
  const rows = normalizeRows<SqlRow>(await sql`
    SELECT manager_pin_hash, staff_pin_hash, updated_at
    FROM security_pins
    WHERE id = ${PIN_ROW_ID}
    LIMIT 1
  `);

  const row = rows[0] as PinsRow | undefined;
  if (row) {
    return row;
  }

  return {
    manager_pin_hash: null,
    staff_pin_hash: null,
    updated_at: null,
  };
}

function statusFromRow(scope: PinScope, row: PinsRow): PinStatus {
  const column = COLUMN_BY_SCOPE[scope];
  const hash = row?.[column];
  return {
    scope,
    isSet: typeof hash === "string" && hash.trim().length > 0,
    updatedAt: parseUpdatedAt(row?.updated_at),
  };
}

export async function getSecurityPinsSummary(): Promise<SecurityPinsSummary> {
  await ensureStorage();
  const row = await fetchPinsRow();
  const updatedAt = parseUpdatedAt(row?.updated_at);
  const hasManager = typeof row.manager_pin_hash === "string" && row.manager_pin_hash.trim().length > 0;
  const hasStaff = typeof row.staff_pin_hash === "string" && row.staff_pin_hash.trim().length > 0;

  return { hasManager, hasStaff, updatedAt };
}

export async function getSecurityPinStatuses(): Promise<PinStatus[]> {
  await ensureStorage();
  const row = await fetchPinsRow();
  return [statusFromRow("staff", row), statusFromRow("manager", row)];
}

export async function isSecurityPinEnabled(scope: PinScope): Promise<boolean> {
  const statuses = await getSecurityPinStatuses();
  return statuses.some((status) => status.scope === scope && status.isSet);
}

export async function verifySecurityPin(scope: PinScope, pin: string): Promise<boolean> {
  await ensureStorage();
  const sanitized = sanitizePin(pin);
  const row = await fetchPinsRow();
  const column = COLUMN_BY_SCOPE[scope];
  const hash = row?.[column];
  return verifyHash(sanitized, hash);
}

export async function updateSecurityPin(scope: PinScope, pin: string): Promise<PinStatus> {
  await ensureStorage();
  const sql = getSqlClient();
  const column = COLUMN_BY_SCOPE[scope];
  const sanitized = sanitizePin(pin);
  const hashed = await hashPin(sanitized);

  const query = `
    UPDATE security_pins
    SET ${column} = $1,
        updated_at = now()
    WHERE id = ${PIN_ROW_ID}
  `;

  await (sql as unknown as { unsafe: (query: string, params?: unknown[]) => Promise<unknown> }).unsafe(
    query,
    [hashed],
  );

  const row = await fetchPinsRow();
  return statusFromRow(scope, row);
}

export async function updateSecurityPins({
  staffPin,
  managerPin,
}: {
  staffPin?: string;
  managerPin?: string;
}): Promise<void> {
  await ensureStorage();
  const sql = getSqlClient();

  if (!staffPin && !managerPin) {
    throw new Error("Debes indicar al menos un PIN para actualizar.");
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (typeof staffPin === "string") {
    const sanitized = sanitizePin(staffPin);
    const hashed = await hashPin(sanitized);
    updates.push("staff_pin_hash = $" + (updates.length + 1));
    values.push(hashed);
  }

  if (typeof managerPin === "string") {
    const sanitized = sanitizePin(managerPin);
    const hashed = await hashPin(sanitized);
    updates.push("manager_pin_hash = $" + (updates.length + 1));
    values.push(hashed);
  }

  updates.push(`updated_at = now()`);

  const query = `
    UPDATE security_pins
    SET ${updates.join(", ")}
    WHERE id = ${PIN_ROW_ID}
  `;

  await (sql as unknown as { unsafe: (query: string, params?: unknown[]) => Promise<unknown> }).unsafe(
    query,
    values,
  );
}

export { sanitizePin };

export async function _hashPinForTests(pin: string): Promise<string> {
  await ensureStorage();
  return hashPin(pin);
}

export async function _verifyHashForTests(
  pin: string,
  hash: string | null | undefined,
): Promise<boolean> {
  await ensureStorage();
  return verifyHash(pin, hash);
}
