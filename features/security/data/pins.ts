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

const PIN_HASH_CANDIDATE_KEYS = [
  "pin_hash",
  "pinHash",
  "pinhash",
  "pin",
] as const;

const PIN_UPDATED_AT_CANDIDATE_KEYS = [
  "updated_at",
  "updatedAt",
  "updatedat",
] as const;

type PinTableMetadata = {
  columnNames: Map<string, string>;
};

type UnsafeQueryRunner = (
  query: string,
  params?: unknown[],
) => Promise<unknown>;

function runUnsafeQuery(
  sql: ReturnType<typeof getSqlClient>,
  query: string,
  params: unknown[],
): Promise<unknown> {
  const unsafe = sql.unsafe as unknown as UnsafeQueryRunner;
  return unsafe(query, params);
}

function normalizeColumnKey(name: string): string {
  return name.trim().toLowerCase();
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function findColumn(
  metadata: PinTableMetadata,
  candidates: readonly string[],
): string | undefined {
  for (const candidate of candidates) {
    const normalized = normalizeColumnKey(candidate);
    const actual = metadata.columnNames.get(normalized);
    if (actual) {
      return actual;
    }
  }
  return undefined;
}

async function loadPinTableMetadata(sql = getSqlClient()): Promise<PinTableMetadata> {
  const rows = normalizeRows<SqlRow>(await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'security_pins'
      AND table_schema = ANY (current_schemas(false))
  `);

  const columnNames = new Map<string, string>();
  rows.forEach((row) => {
    const rawName = row.column_name;
    if (typeof rawName === "string" && rawName.trim().length > 0) {
      columnNames.set(normalizeColumnKey(rawName), rawName);
    }
  });

  return { columnNames };
}

async function ensurePinsTable(): Promise<PinTableMetadata> {
  const sql = getSqlClient();
  await sql`
    CREATE TABLE IF NOT EXISTS security_pins (
      scope text PRIMARY KEY,
      pin_hash text,
      updated_at timestamptz DEFAULT now()
    )
  `;

  let metadata = await loadPinTableMetadata(sql);

  if (!findColumn(metadata, PIN_HASH_CANDIDATE_KEYS)) {
    try {
      await sql`
        ALTER TABLE security_pins
        ADD COLUMN IF NOT EXISTS pin_hash text
      `;
    } catch (error) {
      console.warn("No se pudo agregar la columna pin_hash a security_pins:", error);
    }
    metadata = await loadPinTableMetadata(sql);
  }

  if (!findColumn(metadata, PIN_UPDATED_AT_CANDIDATE_KEYS)) {
    try {
      await sql`
        ALTER TABLE security_pins
        ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()
      `;
    } catch (error) {
      console.warn(
        "No se pudo agregar la columna updated_at a security_pins:",
        error,
      );
    }
    metadata = await loadPinTableMetadata(sql);
  }

  return metadata;
}

function parseStatusRow(scope: PinScope, row?: SqlRow): PinStatus {
  let updatedAt: string | null = null;
  for (const key of PIN_UPDATED_AT_CANDIDATE_KEYS) {
    if (!row) break;
    const value = row[key];
    if (value instanceof Date) {
      updatedAt = value.toISOString();
      break;
    }
    if (typeof value === "string" && value.trim().length > 0) {
      updatedAt = value;
      break;
    }
  }
  const hasPin = PIN_HASH_CANDIDATE_KEYS.some((key) => {
    const value = row?.[key];
    return typeof value === "string" && value.trim().length > 0;
  });
  return {
    scope,
    isSet: hasPin,
    updatedAt: updatedAt ? String(updatedAt) : null,
  };
}

export async function getSecurityPinStatuses(): Promise<PinStatus[]> {
  await ensurePinsTable();
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT *
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
  for (const key of PIN_HASH_CANDIDATE_KEYS) {
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

export async function verifySecurityPin(
  scope: PinScope,
  pin: string,
): Promise<boolean> {
  await ensurePinsTable();
  const sql = getSqlClient();
  const normalizedScope = normalizeScope(scope);

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT *
    FROM security_pins
    WHERE scope = ${normalizedScope}
    LIMIT 1
  `);

  if (!rows.length) return false;
  const row = rows[0] ?? {};
  const hashKey = PIN_HASH_CANDIDATE_KEYS.find((key) => {
    const value = row[key];
    return typeof value === "string" && value.trim().length > 0;
  });

  if (!hashKey) {
    return false;
  }

  const hash = row[hashKey] as string;

  try {
    return await verifyHash(pin, hash);
  } catch (error) {
    console.error("Fallo al verificar PIN", error);
    return false;
  }
}

export async function updateSecurityPin(scope: PinScope, pin: string): Promise<PinStatus> {
  const metadata = await ensurePinsTable();
  const sql = getSqlClient();
  const normalizedScope = normalizeScope(scope);
  const normalizedPin = sanitizePin(pin);
  const hashed = await hashPin(normalizedPin);

  const hashColumn =
    findColumn(metadata, PIN_HASH_CANDIDATE_KEYS) ?? "pin_hash";
  const updatedAtColumn = findColumn(metadata, PIN_UPDATED_AT_CANDIDATE_KEYS);

  const quotedHashColumn = quoteIdentifier(hashColumn);
  const quotedUpdatedAtColumn = updatedAtColumn
    ? quoteIdentifier(updatedAtColumn)
    : null;
  const updateAssignments = [
    `${quotedHashColumn} = EXCLUDED.${quotedHashColumn}`,
  ];

  if (quotedUpdatedAtColumn) {
    updateAssignments.push(`${quotedUpdatedAtColumn} = now()`);
  }

  const columns = ["scope", quotedHashColumn];
  if (quotedUpdatedAtColumn) {
    columns.push(quotedUpdatedAtColumn);
  }

  const values = ["$1", "$2"];
  if (quotedUpdatedAtColumn) {
    values.push("now()");
  }

  const query = `
    INSERT INTO security_pins (${columns.join(", ")})
    VALUES (${values.join(", ")})
    ON CONFLICT (scope)
    DO UPDATE SET ${updateAssignments.join(", ")}
    RETURNING *
  `;

  const rows = normalizeRows<SqlRow>(
    await runUnsafeQuery(sql, query, [normalizedScope, hashed]),
  );

  return parseStatusRow(scope, rows[0]);
}
