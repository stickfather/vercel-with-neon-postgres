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

const DEFAULT_PIN = "1234";

type PinRow = {
  manager_pin?: string | null;
  staff_pin?: string | null;
  updated_at?: string | null;
};

type PinRecord = {
  managerPin: string | null;
  staffPin: string | null;
  updatedAt: string | null;
};

type PinUpdates = {
  staffPin?: string;
  managerPin?: string;
};

const fallbackPinStore: Record<PinScope, { value: string; updatedAt: string | null }> = {
  staff: { value: DEFAULT_PIN, updatedAt: null },
  manager: { value: DEFAULT_PIN, updatedAt: null },
};

function sanitizePin(pin: string): string {
  const trimmed = pin.trim();
  if (!/^\d{4,8}$/.test(trimmed)) {
    throw new Error("El PIN debe tener entre 4 y 8 dígitos numéricos.");
  }
  return trimmed;
}

function normalizePinValue(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  return null;
}

async function fetchPinRecord(): Promise<PinRecord | null> {
  try {
    const sql = getSqlClient();
    const rows = normalizeRows<PinRow>(
      await sql`SELECT manager_pin, staff_pin, updated_at FROM public.pins ORDER BY updated_at DESC LIMIT 1`,
    );
    const row = rows[0];
    if (!row) {
      return null;
    }
    return {
      managerPin: normalizePinValue(row.manager_pin),
      staffPin: normalizePinValue(row.staff_pin),
      updatedAt: normalizePinValue(row.updated_at),
    };
  } catch (error) {
    console.warn("Falling back to in-memory PIN store", error);
    return null;
  }
}

async function getPinRecord(): Promise<PinRecord> {
  const record = await fetchPinRecord();
  if (record) {
    return record;
  }
  return {
    managerPin: fallbackPinStore.manager.value,
    staffPin: fallbackPinStore.staff.value,
    updatedAt: null,
  };
}

async function savePinRecord({ managerPin, staffPin }: { managerPin: string | null; staffPin: string | null }): Promise<void> {
  try {
    const sql = getSqlClient();
    await sql`
      INSERT INTO public.pins (id, manager_pin, staff_pin, updated_at)
      VALUES (1, ${managerPin}::text, ${staffPin}::text, NOW())
      ON CONFLICT (id) DO UPDATE
      SET
        manager_pin = EXCLUDED.manager_pin,
        staff_pin = EXCLUDED.staff_pin,
        updated_at = NOW()
    `;
  } catch (error) {
    console.warn("No se pudo persistir el PIN en la base de datos", error);
    if (managerPin != null) {
      fallbackPinStore.manager.value = managerPin;
      fallbackPinStore.manager.updatedAt = new Date().toISOString();
    }
    if (staffPin != null) {
      fallbackPinStore.staff.value = staffPin;
      fallbackPinStore.staff.updatedAt = new Date().toISOString();
    }
  }
}

function getLatestUpdatedAt(): string | null {
  const timestamps = Object.values(fallbackPinStore)
    .map((record) => record.updatedAt)
    .filter((value): value is string => typeof value === "string");
  if (timestamps.length === 0) {
    return null;
  }
  return timestamps.sort().at(-1) ?? null;
}

export async function getSecurityPinsSummary(): Promise<SecurityPinsSummary> {
  const record = await getPinRecord();
  return {
    hasManager: Boolean(record.managerPin && record.managerPin.length > 0),
    hasStaff: Boolean(record.staffPin && record.staffPin.length > 0),
    updatedAt: record.updatedAt ?? getLatestUpdatedAt(),
  };
}

export async function getSecurityPinStatuses(): Promise<PinStatus[]> {
  const record = await getPinRecord();
  return [
    {
      scope: "manager",
      isSet: Boolean(record.managerPin && record.managerPin.length > 0),
      updatedAt: record.updatedAt,
    },
    {
      scope: "staff",
      isSet: Boolean(record.staffPin && record.staffPin.length > 0),
      updatedAt: record.updatedAt,
    },
  ];
}

export async function isSecurityPinEnabled(scope: PinScope): Promise<boolean> {
  const record = await getPinRecord();
  const value = scope === "manager" ? record.managerPin : record.staffPin;
  return Boolean(value && value.length > 0);
}

export async function updateSecurityPins({
  staffPin,
  managerPin,
}: PinUpdates): Promise<void> {
  const current = await getPinRecord();
  const nextManager = typeof managerPin === "string" ? sanitizePin(managerPin) : current.managerPin;
  const nextStaff = typeof staffPin === "string" ? sanitizePin(staffPin) : current.staffPin;

  await savePinRecord({ managerPin: nextManager, staffPin: nextStaff });
}

export async function verifySecurityPin(
  scope: PinScope,
  pin: string,
): Promise<boolean> {
  try {
    const sanitized = sanitizePin(pin);
    const record = await getPinRecord();
    const stored = scope === "manager" ? record.managerPin : record.staffPin;
    if (stored) {
      return stored === sanitized;
    }
    return fallbackPinStore[scope].value === sanitized;
  } catch (error) {
    return false;
  }
}

export function __resetPinsForTests() {
  fallbackPinStore.manager.value = DEFAULT_PIN;
  fallbackPinStore.manager.updatedAt = null;
  fallbackPinStore.staff.value = DEFAULT_PIN;
  fallbackPinStore.staff.updatedAt = null;
}
