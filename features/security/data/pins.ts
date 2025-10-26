import { getSqlClient, normalizeRows, type SqlRow } from "@/lib/db/client";
import bcrypt from "@/lib/security/bcrypt";

import type { PinScope } from "@/lib/security/pin-session";

type AccessPinRow = SqlRow & {
  role?: unknown;
  pin_hash?: unknown;
  updated_at?: unknown;
  active?: unknown;
};

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

type PinUpdates = {
  staffPin?: string;
  managerPin?: string;
};

const PIN_PATTERN = /^\d{4}$/;

export function sanitizePin(pin: string): string {
  const trimmed = pin.trim();
  if (!PIN_PATTERN.test(trimmed)) {
    throw new Error("El PIN debe tener exactamente 4 dígitos numéricos.");
  }
  return trimmed;
}

function toPinScope(value: unknown): PinScope | null {
  if (typeof value !== "string") return null;
  if (value === "staff" || value === "manager") return value;
  return null;
}

function normalizeTimestamp(value: unknown): string | null {
  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  return null;
}

async function fetchActivePin(
  scope: PinScope,
  sql = getSqlClient(),
): Promise<AccessPinRow | null> {
  const rows = normalizeRows<AccessPinRow>(
    await sql`
      SELECT role, pin_hash, updated_at, active
      FROM access_pins
      WHERE role = ${scope}
        AND active = TRUE
      ORDER BY updated_at DESC NULLS LAST
      LIMIT 1
    `,
  );

  return rows[0] ?? null;
}

export async function getSecurityPinStatuses(
  sql = getSqlClient(),
): Promise<PinStatus[]> {
  const rows = normalizeRows<AccessPinRow>(
    await sql`
      SELECT role, pin_hash, updated_at, active
      FROM access_pins
      WHERE role IN ('staff', 'manager')
        AND active = TRUE
    `,
  );

  const byScope = new Map<PinScope, PinStatus>();

  for (const row of rows) {
    const scope = toPinScope(row.role);
    if (!scope) continue;
    const updatedAt = normalizeTimestamp(row.updated_at);
    const isSet = typeof row.pin_hash === "string" && row.pin_hash.length > 0;

    const existing = byScope.get(scope);
    if (!existing) {
      byScope.set(scope, { scope, isSet, updatedAt });
      continue;
    }

    const latest = [existing.updatedAt, updatedAt]
      .filter((value): value is string => typeof value === "string")
      .sort()
      .at(-1);

    byScope.set(scope, {
      scope,
      isSet: existing.isSet || isSet,
      updatedAt: latest ?? existing.updatedAt ?? updatedAt ?? null,
    });
  }

  const defaults: PinStatus[] = [
    { scope: "manager", isSet: false, updatedAt: null },
    { scope: "staff", isSet: false, updatedAt: null },
  ];

  return defaults.map((defaultStatus) => byScope.get(defaultStatus.scope) ?? defaultStatus);
}

export async function getSecurityPinsSummary(
  sql = getSqlClient(),
): Promise<SecurityPinsSummary> {
  const statuses = await getSecurityPinStatuses(sql);

  const managerStatus = statuses.find((status) => status.scope === "manager");
  const staffStatus = statuses.find((status) => status.scope === "staff");

  const timestamps = statuses
    .map((status) => status.updatedAt)
    .filter((value): value is string => typeof value === "string")
    .sort();

  return {
    hasManager: Boolean(managerStatus?.isSet),
    hasStaff: Boolean(staffStatus?.isSet),
    updatedAt: timestamps.at(-1) ?? null,
  };
}

export async function isSecurityPinEnabled(
  scope: PinScope,
  sql = getSqlClient(),
): Promise<boolean> {
  const record = await fetchActivePin(scope, sql);
  return typeof record?.pin_hash === "string" && record.pin_hash.length > 0;
}

export async function verifySecurityPin(
  scope: PinScope,
  pin: string,
  sql = getSqlClient(),
): Promise<boolean> {
  try {
    const sanitized = sanitizePin(pin);
    const record = await fetchActivePin(scope, sql);
    const storedHash = typeof record?.pin_hash === "string" ? record.pin_hash : null;
    if (!storedHash) return false;
    return bcrypt.compare(sanitized, storedHash, sql);
  } catch (error) {
    return false;
  }
}

export async function updateSecurityPins(
  { staffPin, managerPin }: PinUpdates,
  sql = getSqlClient(),
): Promise<void> {
  if (!staffPin && !managerPin) {
    throw new Error("Debes indicar al menos un PIN para actualizar.");
  }

  if (typeof staffPin === "string") {
    await updateAccessPin("staff", staffPin, sql);
  }

  if (typeof managerPin === "string") {
    await updateAccessPin("manager", managerPin, sql);
  }
}

export async function updateAccessPin(
  scope: PinScope,
  pin: string,
  sql = getSqlClient(),
): Promise<string> {
  const sanitized = sanitizePin(pin);
  const hashed = await bcrypt.hash(sanitized, sql);

  const updatedRows = normalizeRows<{ updated_at?: unknown }>(
    await sql`
      UPDATE access_pins
      SET pin_hash = ${hashed},
          active = TRUE,
          updated_at = now()
      WHERE role = ${scope}
        AND active = TRUE
      RETURNING updated_at
    `,
  );

  const updatedAtCandidate = updatedRows[0]?.updated_at;
  if (updatedRows.length > 0) {
    return (
      normalizeTimestamp(updatedAtCandidate) ?? new Date().toISOString()
    );
  }

  const insertedRows = normalizeRows<{ updated_at?: unknown }>(
    await sql`
      INSERT INTO access_pins (role, pin_hash, active)
      VALUES (${scope}, ${hashed}, TRUE)
      RETURNING updated_at
    `,
  );

  const insertedAtCandidate = insertedRows[0]?.updated_at;
  return normalizeTimestamp(insertedAtCandidate) ?? new Date().toISOString();
}

export async function validateAccessPin(
  scope: PinScope,
  pin: string,
  sql = getSqlClient(),
): Promise<boolean> {
  try {
    const sanitized = sanitizePin(pin);
    const record = await fetchActivePin(scope, sql);
    const storedHash = typeof record?.pin_hash === "string" ? record.pin_hash : null;
    if (!storedHash) {
      return false;
    }
    return bcrypt.compare(sanitized, storedHash, sql);
  } catch (error) {
    return false;
  }
}

export const __sanitizePinForTests = sanitizePin;
