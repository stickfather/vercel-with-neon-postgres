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
const DEFAULT_PIN = "1234";

const COLUMN_BY_SCOPE: Record<PinScope, "manager_pin_hash" | "staff_pin_hash"> = {
  staff: "staff_pin_hash",
  manager: "manager_pin_hash",
};

type PinsRow = {
  manager_pin_hash: string | null;
  staff_pin_hash: string | null;
  updated_at: Date | string | null;
  force_default: boolean | null;
  customized_at: Date | string | null;
};

function looksLikeBcrypt(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^\$2[aby]\$\d{2}\$[./0-9A-Za-z]{53}$/.test(trimmed);
}

function looksLikePlainPin(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^\d{4,8}$/.test(trimmed);
}

function hasStoredPinValue(value: unknown): value is string {
  return looksLikeBcrypt(value) || looksLikePlainPin(value);
}

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

async function hashPin(pin: string, sql = getSqlClient()): Promise<string> {
  await ensurePgcrypto(sql);
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
      updated_at timestamptz DEFAULT now(),
      force_default boolean DEFAULT true,
      customized_at timestamptz
    )
  `;
  await sql`ALTER TABLE security_pins ALTER COLUMN manager_pin_hash DROP NOT NULL`;
  await sql`ALTER TABLE security_pins ALTER COLUMN staff_pin_hash DROP NOT NULL`;
  await sql`ALTER TABLE security_pins ADD COLUMN IF NOT EXISTS force_default boolean DEFAULT true`;
  await sql`ALTER TABLE security_pins ALTER COLUMN force_default SET DEFAULT true`;
  await sql`ALTER TABLE security_pins ADD COLUMN IF NOT EXISTS customized_at timestamptz`;
  await sql`
    INSERT INTO security_pins (id, manager_pin_hash, staff_pin_hash, force_default, customized_at)
    VALUES (
      ${PIN_ROW_ID},
      crypt(${DEFAULT_PIN}, gen_salt('bf', 12)),
      crypt(${DEFAULT_PIN}, gen_salt('bf', 12)),
      true,
      NULL
    )
    ON CONFLICT (id) DO NOTHING
  `;
  await sql`DELETE FROM security_pins WHERE id <> ${PIN_ROW_ID}`;
  await sql`
    UPDATE security_pins
    SET force_default = true
    WHERE id = ${PIN_ROW_ID}
      AND customized_at IS NULL
      AND force_default IS DISTINCT FROM true
  `;
  await ensureDefaultPins(sql);
}

async function fetchPinsRowRaw(sql = getSqlClient()): Promise<PinsRow | undefined> {
  const rows = normalizeRows<SqlRow>(await sql`
    SELECT manager_pin_hash, staff_pin_hash, updated_at, force_default, customized_at
    FROM security_pins
    WHERE id = ${PIN_ROW_ID}
    LIMIT 1
  `);

  return rows[0] as PinsRow | undefined;
}

async function ensureDefaultPins(sql = getSqlClient()): Promise<PinsRow | null> {
  await ensurePgcrypto(sql);
  const rows = normalizeRows<SqlRow>(await sql`
    UPDATE security_pins
    SET
      staff_pin_hash = CASE
        WHEN force_default IS TRUE
          OR staff_pin_hash IS NULL
          OR btrim(staff_pin_hash) = ''
          OR NOT (
            staff_pin_hash ~ '^\\$2[aby]\\$\\d{2}\\$[./0-9A-Za-z]{53}$'
            OR staff_pin_hash ~ '^\\d{4,8}$'
          )
        THEN crypt(${DEFAULT_PIN}, gen_salt('bf', 12))
        ELSE staff_pin_hash
      END,
      manager_pin_hash = CASE
        WHEN force_default IS TRUE
          OR manager_pin_hash IS NULL
          OR btrim(manager_pin_hash) = ''
          OR NOT (
            manager_pin_hash ~ '^\\$2[aby]\\$\\d{2}\\$[./0-9A-Za-z]{53}$'
            OR manager_pin_hash ~ '^\\d{4,8}$'
          )
        THEN crypt(${DEFAULT_PIN}, gen_salt('bf', 12))
        ELSE manager_pin_hash
      END,
      updated_at = CASE
        WHEN (
          force_default IS TRUE
          OR staff_pin_hash IS NULL
          OR btrim(staff_pin_hash) = ''
          OR NOT (
            staff_pin_hash ~ '^\\$2[aby]\\$\\d{2}\\$[./0-9A-Za-z]{53}$'
            OR staff_pin_hash ~ '^\\d{4,8}$'
          )
        )
        OR (
          force_default IS TRUE
          OR manager_pin_hash IS NULL
          OR btrim(manager_pin_hash) = ''
          OR NOT (
            manager_pin_hash ~ '^\\$2[aby]\\$\\d{2}\\$[./0-9A-Za-z]{53}$'
            OR manager_pin_hash ~ '^\\d{4,8}$'
          )
        )
        THEN now()
        ELSE updated_at
      END,
      force_default = CASE
        WHEN force_default IS TRUE THEN true
        ELSE force_default
      END
    WHERE id = ${PIN_ROW_ID}
      AND (
        force_default IS TRUE
        OR staff_pin_hash IS NULL
        OR btrim(staff_pin_hash) = ''
        OR NOT (
          staff_pin_hash ~ '^\\$2[aby]\\$\\d{2}\\$[./0-9A-Za-z]{53}$'
          OR staff_pin_hash ~ '^\\d{4,8}$'
        )
        OR manager_pin_hash IS NULL
        OR btrim(manager_pin_hash) = ''
        OR NOT (
          manager_pin_hash ~ '^\\$2[aby]\\$\\d{2}\\$[./0-9A-Za-z]{53}$'
          OR manager_pin_hash ~ '^\\d{4,8}$'
        )
      )
    RETURNING manager_pin_hash, staff_pin_hash, updated_at, force_default, customized_at
  `);

  return (rows[0] as PinsRow | undefined) ?? null;
}

async function fetchPinsRow(): Promise<PinsRow> {
  const sql = getSqlClient();
  let row = await fetchPinsRowRaw(sql);

  if (!row) {
    await ensureDefaultPins(sql);
    row = await fetchPinsRowRaw(sql);
  } else if (
    row.force_default === true ||
    !hasStoredPinValue(row.staff_pin_hash) ||
    !hasStoredPinValue(row.manager_pin_hash)
  ) {
    const seeded = await ensureDefaultPins(sql);
    if (seeded) {
      row = seeded;
    } else {
      row = await fetchPinsRowRaw(sql);
    }
  }

  return (
    row ?? {
      manager_pin_hash: null,
      staff_pin_hash: null,
      updated_at: null,
      force_default: null,
      customized_at: null,
    }
  );
}

function statusFromRow(scope: PinScope, row: PinsRow): PinStatus {
  const column = COLUMN_BY_SCOPE[scope];
  const hash = row?.[column];
  return {
    scope,
    isSet: hasStoredPinValue(hash),
    updatedAt: parseUpdatedAt(row?.updated_at),
  };
}

export async function getSecurityPinsSummary(): Promise<SecurityPinsSummary> {
  await ensureStorage();
  const row = await fetchPinsRow();
  const updatedAt = parseUpdatedAt(row?.updated_at);
  const hasManager = hasStoredPinValue(row.manager_pin_hash);
  const hasStaff = hasStoredPinValue(row.staff_pin_hash);

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
  const rawValue = row?.[column];
  const trimmed = typeof rawValue === "string" ? rawValue.trim() : "";
  const defaultActive = row?.force_default === true || !hasStoredPinValue(rawValue);

  if (sanitized === DEFAULT_PIN && defaultActive) {
    if (!looksLikeBcrypt(trimmed)) {
      await ensureDefaultPins();
    }
    return true;
  }

  if (!hasStoredPinValue(rawValue)) {
    if (sanitized === DEFAULT_PIN) {
      await ensureDefaultPins();
      return true;
    }
    return false;
  }

  const stored = trimmed;

  if (looksLikeBcrypt(stored)) {
    return verifyHash(sanitized, stored);
  }

  if (stored === sanitized) {
    await updateSecurityPin(scope, sanitized);
    return true;
  }

  return false;
}

export async function updateSecurityPin(scope: PinScope, pin: string): Promise<PinStatus> {
  await updateSecurityPins(
    scope === "manager"
      ? { managerPin: pin }
      : { staffPin: pin },
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

  let staffHash: string | null = null;
  let managerHash: string | null = null;

  if (typeof staffPin === "string") {
    const sanitized = sanitizePin(staffPin);
    staffHash = await hashPin(sanitized, sql);
  }

  if (typeof managerPin === "string") {
    const sanitized = sanitizePin(managerPin);
    managerHash = await hashPin(sanitized, sql);
  }

  if (staffHash === null && managerHash === null) {
    throw new Error("Debes indicar al menos un PIN para actualizar.");
  }

  await sql`
    INSERT INTO security_pins (id, staff_pin_hash, manager_pin_hash, updated_at)
    VALUES (
      ${PIN_ROW_ID},
      ${staffHash},
      ${managerHash},
      now()
    )
    ON CONFLICT (id) DO UPDATE
    SET
      staff_pin_hash = COALESCE(EXCLUDED.staff_pin_hash, security_pins.staff_pin_hash),
      manager_pin_hash = COALESCE(EXCLUDED.manager_pin_hash, security_pins.manager_pin_hash),
      updated_at = now(),
      force_default = false,
      customized_at = now()
  `;
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
