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

const PIN_SCOPE_CANDIDATE_KEYS = ["scope"] as const;

const PIN_UPDATED_AT_CANDIDATE_KEYS = [
  "updated_at",
  "updatedAt",
  "updatedat",
] as const;

const PIN_MANAGER_HASH_CANDIDATE_KEYS = [
  "manager_pin_hash",
  "managerPinHash",
  "manager_hash",
  "managerhash",
] as const;

const PIN_STAFF_HASH_CANDIDATE_KEYS = [
  "staff_pin_hash",
  "staffPinHash",
  "staff_hash",
  "staffhash",
] as const;

const PIN_ID_CANDIDATE_KEYS = ["id", "pin_id", "pinId"] as const;

const PIN_MANAGER_UPDATED_AT_CANDIDATE_KEYS = [
  "manager_updated_at",
  "managerUpdatedAt",
  "managerupdatedat",
] as const;

const PIN_STAFF_UPDATED_AT_CANDIDATE_KEYS = [
  "staff_updated_at",
  "staffUpdatedAt",
  "staffupdatedat",
] as const;

type PinTableShape =
  | {
      kind: "scopedRows";
      scopeColumn: string;
      hashColumn: string;
      updatedAtColumn: string | null;
    }
  | {
      kind: "combined";
      managementColumn: string | null;
      staffColumn: string | null;
      updatedAtColumn: string | null;
      managementUpdatedAtColumn: string | null;
      staffUpdatedAtColumn: string | null;
      idColumn: string | null;
    };

type PinTableMetadata = {
  columnNames: Map<string, string>;
  shape: PinTableShape;
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
  metadata: { columnNames: Map<string, string> },
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

function detectPinTableShape(metadata: { columnNames: Map<string, string> }): PinTableShape {
  const scopeColumn = findColumn(
    { ...metadata, shape: { kind: "scopedRows", scopeColumn: "", hashColumn: "", updatedAtColumn: null } },
    PIN_SCOPE_CANDIDATE_KEYS,
  );
  if (scopeColumn) {
    const hashColumn =
      findColumn(
        { ...metadata, shape: { kind: "scopedRows", scopeColumn: "", hashColumn: "", updatedAtColumn: null } },
        PIN_HASH_CANDIDATE_KEYS,
      ) ?? PIN_HASH_CANDIDATE_KEYS[0];
    const updatedAtColumn = findColumn(
      { ...metadata, shape: { kind: "scopedRows", scopeColumn: "", hashColumn: "", updatedAtColumn: null } },
      PIN_UPDATED_AT_CANDIDATE_KEYS,
    );
    return {
      kind: "scopedRows",
      scopeColumn,
      hashColumn,
      updatedAtColumn: updatedAtColumn ?? null,
    } satisfies PinTableShape;
  }

  const managementColumn = findColumn(
    { ...metadata, shape: { kind: "combined", managementColumn: null, staffColumn: null, updatedAtColumn: null, managementUpdatedAtColumn: null, staffUpdatedAtColumn: null, idColumn: null } },
    PIN_MANAGER_HASH_CANDIDATE_KEYS,
  );
  const staffColumn = findColumn(
    { ...metadata, shape: { kind: "combined", managementColumn: null, staffColumn: null, updatedAtColumn: null, managementUpdatedAtColumn: null, staffUpdatedAtColumn: null, idColumn: null } },
    PIN_STAFF_HASH_CANDIDATE_KEYS,
  );

  if (managementColumn || staffColumn) {
    const updatedAtColumn = findColumn(
      { ...metadata, shape: { kind: "combined", managementColumn: null, staffColumn: null, updatedAtColumn: null, managementUpdatedAtColumn: null, staffUpdatedAtColumn: null, idColumn: null } },
      PIN_UPDATED_AT_CANDIDATE_KEYS,
    );
    const managementUpdatedAtColumn = findColumn(
      { ...metadata, shape: { kind: "combined", managementColumn: null, staffColumn: null, updatedAtColumn: null, managementUpdatedAtColumn: null, staffUpdatedAtColumn: null, idColumn: null } },
      PIN_MANAGER_UPDATED_AT_CANDIDATE_KEYS,
    );
    const staffUpdatedAtColumn = findColumn(
      { ...metadata, shape: { kind: "combined", managementColumn: null, staffColumn: null, updatedAtColumn: null, managementUpdatedAtColumn: null, staffUpdatedAtColumn: null, idColumn: null } },
      PIN_STAFF_UPDATED_AT_CANDIDATE_KEYS,
    );
    const idColumn = findColumn(
      { ...metadata, shape: { kind: "combined", managementColumn: null, staffColumn: null, updatedAtColumn: null, managementUpdatedAtColumn: null, staffUpdatedAtColumn: null, idColumn: null } },
      PIN_ID_CANDIDATE_KEYS,
    );
    return {
      kind: "combined",
      managementColumn: managementColumn ?? null,
      staffColumn: staffColumn ?? null,
      updatedAtColumn: updatedAtColumn ?? null,
      managementUpdatedAtColumn: managementUpdatedAtColumn ?? null,
      staffUpdatedAtColumn: staffUpdatedAtColumn ?? null,
      idColumn: idColumn ?? null,
    } satisfies PinTableShape;
  }

  return {
    kind: "scopedRows",
    scopeColumn: PIN_SCOPE_CANDIDATE_KEYS[0],
    hashColumn: PIN_HASH_CANDIDATE_KEYS[0],
    updatedAtColumn: null,
  } satisfies PinTableShape;
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

  return { columnNames, shape: detectPinTableShape({ columnNames }) };
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

  return { ...metadata, shape: detectPinTableShape(metadata) };
}

function readScopeValue(row: SqlRow | undefined, scopeColumn: string): string {
  if (!row) {
    return "";
  }

  const value = row[scopeColumn];
  if (typeof value === "string") {
    return value.trim().toLowerCase();
  }
  if (value instanceof Date) {
    return value.toISOString().toLowerCase();
  }
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim().toLowerCase();
}

function readUpdatedAt(row: SqlRow | undefined, column: string | null): string | null {
  if (!row || !column) {
    return null;
  }
  const value = row[column];
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return null;
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
  const metadata = await ensurePinsTable();
  const sql = getSqlClient();

  if (metadata.shape.kind === "combined") {
    const orderClause = metadata.shape.idColumn
      ? `ORDER BY ${quoteIdentifier(metadata.shape.idColumn)} ASC`
      : "";
    const rows = normalizeRows<SqlRow>(
      await runUnsafeQuery(
        sql,
        `
          SELECT *
          FROM security_pins
          ${orderClause}
          LIMIT 1
        `,
        [],
      ),
    );
    const row = rows[0];

    const toStatus = (scope: PinScope): PinStatus => {
      const hashColumn =
        scope === "management" ? metadata.shape.managementColumn : metadata.shape.staffColumn;
      const hashValue = hashColumn ? (row?.[hashColumn] as unknown) : null;
      const hasPin =
        typeof hashValue === "string" && hashValue.trim().length > 0;
      const updatedAtColumn =
        scope === "management"
          ? metadata.shape.managementUpdatedAtColumn ?? metadata.shape.updatedAtColumn
          : metadata.shape.staffUpdatedAtColumn ?? metadata.shape.updatedAtColumn;
      return {
        scope,
        isSet: hasPin,
        updatedAt: readUpdatedAt(row, updatedAtColumn),
      };
    };

    return ["staff", "management"].map((scope) => toStatus(scope as PinScope));
  }

  const scopeColumn = metadata.shape.scopeColumn;

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT *
    FROM security_pins
  `);

  const byScope = new Map<string, SqlRow>();
  rows.forEach((row) => {
    const scopeValue = readScopeValue(row, scopeColumn);
    if (scopeValue) {
      byScope.set(scopeValue, row);
    }
  });

  return ["staff", "management"].map((scope) => {
    const normalized = normalizeScope(scope as PinScope);
    return parseStatusRow(scope as PinScope, byScope.get(normalized));
  });
}

export async function isSecurityPinEnabled(scope: PinScope): Promise<boolean> {
  const metadata = await ensurePinsTable();
  const sql = getSqlClient();

  if (metadata.shape.kind === "combined") {
    const rows = normalizeRows<SqlRow>(await sql`
      SELECT *
      FROM security_pins
      LIMIT 1
    `);
    const row = rows[0];
    if (!row) return false;
    const column =
      scope === "management"
        ? metadata.shape.managementColumn
        : metadata.shape.staffColumn;
    if (!column) return false;
    const value = row[column];
    return typeof value === "string" && value.trim().length > 0;
  }

  const normalizedScope = normalizeScope(scope);

  const scopeColumn = metadata.shape.scopeColumn;

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT *
    FROM security_pins
  `);

  if (!rows.length) {
    return false;
  }

  const row = rows.find(
    (candidate) => readScopeValue(candidate, scopeColumn) === normalizedScope,
  );

  if (!row) {
    return false;
  }

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
  const metadata = await ensurePinsTable();

  const sql = getSqlClient();

  if (metadata.shape.kind === "combined") {
    const rows = normalizeRows<SqlRow>(await sql`
      SELECT *
      FROM security_pins
      LIMIT 1
    `);
    const row = rows[0];
    if (!row) return false;
    const column =
      scope === "management"
        ? metadata.shape.managementColumn
        : metadata.shape.staffColumn;
    if (!column) return false;
    const hash = row[column];
    if (typeof hash !== "string" || !hash.trim().length) {
      return false;
    }

    try {
      return await verifyHash(pin, hash);
    } catch (error) {
      console.error("Fallo al verificar PIN", error);
      return false;
    }
  }

  const normalizedScope = normalizeScope(scope);

  const scopeColumn = metadata.shape.scopeColumn;

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT *
    FROM security_pins
  `);

  const row = rows.find(
    (candidate) => readScopeValue(candidate, scopeColumn) === normalizedScope,
  );

  if (!row) return false;
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

async function relaxCombinedSchema(
  sql: ReturnType<typeof getSqlClient>,
  shape: Extract<PinTableShape, { kind: "combined" }>,
): Promise<void> {
  const targets = [shape.managementColumn, shape.staffColumn]
    .filter((value): value is string => Boolean(value));

  for (const column of targets) {
    try {
      await runUnsafeQuery(
        sql,
        `ALTER TABLE security_pins ALTER COLUMN ${quoteIdentifier(column)} DROP NOT NULL`,
        [],
      );
    } catch (error) {
      // Ignored on purpose.
      console.warn("No se pudo ajustar la columna de PIN", column, error);
    }
  }
}

export async function updateSecurityPin(scope: PinScope, pin: string): Promise<PinStatus> {
  const metadata = await ensurePinsTable();
  const sql = getSqlClient();
  const normalizedScope = normalizeScope(scope);
  const normalizedPin = sanitizePin(pin);
  const hashed = await hashPin(normalizedPin);

  if (metadata.shape.kind === "combined") {
    const targetColumn =
      scope === "management"
        ? metadata.shape.managementColumn
        : metadata.shape.staffColumn;

    if (!targetColumn) {
      throw new Error("No se pudo identificar la columna de almacenamiento del PIN.");
    }

    const quotedTargetColumn = quoteIdentifier(targetColumn);
    const params: unknown[] = [hashed];
    const updateSegments = [`${quotedTargetColumn} = $1`];

    const updatedAtColumn =
      scope === "management"
        ? metadata.shape.managementUpdatedAtColumn ?? metadata.shape.updatedAtColumn
        : metadata.shape.staffUpdatedAtColumn ?? metadata.shape.updatedAtColumn;

    if (updatedAtColumn) {
      updateSegments.push(`${quoteIdentifier(updatedAtColumn)} = now()`);
    }

    const whereClause = metadata.shape.idColumn
      ? `WHERE ${quoteIdentifier(metadata.shape.idColumn)} = (
          SELECT ${quoteIdentifier(metadata.shape.idColumn)}
          FROM security_pins
          ORDER BY ${quoteIdentifier(metadata.shape.idColumn)} ASC
          LIMIT 1
        )`
      : "";

    const updateQuery = `
      UPDATE security_pins
      SET ${updateSegments.join(", ")}
      ${whereClause}
      RETURNING *
    `;

    let rows = normalizeRows<SqlRow>(
      await runUnsafeQuery(sql, updateQuery, params),
    );

    if (!rows.length) {
      await relaxCombinedSchema(sql, metadata.shape);

      const insertColumns = [quotedTargetColumn];
      const insertValues = ["$1"];

      const companionColumn =
        scope === "management"
          ? metadata.shape.staffColumn
          : metadata.shape.managementColumn;
      if (companionColumn) {
        insertColumns.push(quoteIdentifier(companionColumn));
        insertValues.push("NULL");
      }

      if (updatedAtColumn && !metadata.shape.managementUpdatedAtColumn && !metadata.shape.staffUpdatedAtColumn) {
        insertColumns.push(quoteIdentifier(updatedAtColumn));
        insertValues.push("now()");
      } else if (updatedAtColumn) {
        insertColumns.push(quoteIdentifier(updatedAtColumn));
        insertValues.push("now()");
      }

      const insertQuery = `
        INSERT INTO security_pins (${insertColumns.join(", ")})
        VALUES (${insertValues.join(", ")})
        RETURNING *
      `;

      rows = normalizeRows<SqlRow>(
        await runUnsafeQuery(sql, insertQuery, params),
      );
    }

    const row = rows[0];
    const hashValue = row && targetColumn ? row[targetColumn] : null;
    const hasPin =
      typeof hashValue === "string" && hashValue.trim().length > 0;
    return {
      scope,
      isSet: hasPin,
      updatedAt: readUpdatedAt(
        row,
        scope === "management"
          ? metadata.shape.managementUpdatedAtColumn ?? metadata.shape.updatedAtColumn
          : metadata.shape.staffUpdatedAtColumn ?? metadata.shape.updatedAtColumn,
      ),
    };
  }

  const scopeColumn = metadata.shape.scopeColumn;
  const quotedScopeColumn = quoteIdentifier(scopeColumn);
  const hashColumn = metadata.shape.hashColumn;
  const updatedAtColumn = metadata.shape.updatedAtColumn;

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

  const columns = [quotedScopeColumn, quotedHashColumn];
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
    ON CONFLICT (${quotedScopeColumn})
    DO UPDATE SET ${updateAssignments.join(", ")}
    RETURNING *
  `;

  const rows = normalizeRows<SqlRow>(
    await runUnsafeQuery(sql, query, [normalizedScope, hashed]),
  );

  return parseStatusRow(scope, rows[0]);
}
