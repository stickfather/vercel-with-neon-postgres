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

type PinRecord = {
  value: string;
  updatedAt: string | null;
};

type PinUpdates = {
  staffPin?: string;
  managerPin?: string;
};

const pinStore: Record<PinScope, PinRecord> = {
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

function getLatestUpdatedAt(): string | null {
  const timestamps = Object.values(pinStore)
    .map((record) => record.updatedAt)
    .filter((value): value is string => typeof value === "string");
  if (timestamps.length === 0) {
    return null;
  }
  return timestamps.sort().at(-1) ?? null;
}

export async function getSecurityPinsSummary(): Promise<SecurityPinsSummary> {
  return {
    hasManager: pinStore.manager.value.length > 0,
    hasStaff: pinStore.staff.value.length > 0,
    updatedAt: getLatestUpdatedAt(),
  };
}

export async function getSecurityPinStatuses(): Promise<PinStatus[]> {
  return [
    {
      scope: "manager",
      isSet: pinStore.manager.value.length > 0,
      updatedAt: pinStore.manager.updatedAt,
    },
    {
      scope: "staff",
      isSet: pinStore.staff.value.length > 0,
      updatedAt: pinStore.staff.updatedAt,
    },
  ];
}

export async function isSecurityPinEnabled(scope: PinScope): Promise<boolean> {
  return pinStore[scope].value.length > 0;
}

export async function updateSecurityPins({
  staffPin,
  managerPin,
}: PinUpdates): Promise<void> {
  const now = new Date().toISOString();

  if (typeof staffPin === "string") {
    const sanitized = sanitizePin(staffPin);
    pinStore.staff.value = sanitized;
    pinStore.staff.updatedAt = now;
  }

  if (typeof managerPin === "string") {
    const sanitized = sanitizePin(managerPin);
    pinStore.manager.value = sanitized;
    pinStore.manager.updatedAt = now;
  }
}

export async function verifySecurityPin(
  scope: PinScope,
  pin: string,
): Promise<boolean> {
  try {
    const sanitized = sanitizePin(pin);
    return pinStore[scope].value === sanitized;
  } catch (error) {
    return false;
  }
}

export function __resetPinsForTests() {
  pinStore.manager.value = DEFAULT_PIN;
  pinStore.manager.updatedAt = null;
  pinStore.staff.value = DEFAULT_PIN;
  pinStore.staff.updatedAt = null;
}
