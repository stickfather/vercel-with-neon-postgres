import { NextResponse } from "next/server";

import { getSqlClient, normalizeRows, type SqlRow } from "@/lib/db/client";

type PinRow = SqlRow & {
  role?: unknown;
  pin?: unknown;
  updated_at?: unknown;
};

type PinResponse = {
  staff_pin: string;
  manager_pin: string;
  version: number;
};

function toRole(value: unknown): "staff" | "manager" | null {
  if (value === "staff" || value === "manager") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "staff" || normalized === "manager") {
      return normalized;
    }
  }
  return null;
}

function toPin(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^\d{4}$/.test(trimmed) ? trimmed : null;
}

function toTimestamp(value: unknown): number | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  const ms = date.getTime();
  return Number.isFinite(ms) ? ms : null;
}

export async function GET() {
  const sql = getSqlClient();

  const rows = normalizeRows<PinRow>(
    await sql`
      WITH latest AS (
        SELECT DISTINCT ON (role)
          role,
          pin_hash,
          updated_at
        FROM access_pins
        WHERE role IN ('staff', 'manager')
          AND active = TRUE
        ORDER BY role, updated_at DESC NULLS LAST
      ),
      candidates AS (
        SELECT to_char(num, 'FM0000') AS pin
        FROM generate_series(0, 9999) AS s(num)
      )
      SELECT
        latest.role,
        candidates.pin,
        latest.updated_at
      FROM latest
      JOIN candidates
        ON crypt(candidates.pin, latest.pin_hash) = latest.pin_hash
    `,
  );

  const map = new Map<"staff" | "manager", { pin: string; updatedAt: number | null }>();

  for (const row of rows) {
    const role = toRole(row.role);
    const pin = toPin(row.pin);
    if (!role || !pin) continue;
    if (!map.has(role)) {
      map.set(role, { pin, updatedAt: toTimestamp(row.updated_at) });
    }
  }

  const staff = map.get("staff");
  const manager = map.get("manager");

  if (!staff || !manager) {
    return NextResponse.json(
      { error: "No pudimos obtener los PIN activos." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const timestamps = [staff.updatedAt, manager.updatedAt].filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );
  const version = timestamps.length
    ? Math.max(...timestamps.map((value) => Math.floor(value)))
    : Date.now();

  const response: PinResponse = {
    staff_pin: staff.pin,
    manager_pin: manager.pin,
    version,
  };

  return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
}
