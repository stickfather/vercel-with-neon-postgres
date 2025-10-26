import { getSqlClient, normalizeRows } from "@/lib/db/client";

const BCRYPT_ROUNDS = 12;

export async function hash(pin: string, sql = getSqlClient()): Promise<string> {
  const rows = normalizeRows<{ hashed?: unknown }>(
    await sql`
      SELECT crypt(${pin}, gen_salt('bf', ${BCRYPT_ROUNDS})) AS hashed
    `,
  );

  const hashed = rows[0]?.hashed;
  if (typeof hashed === "string" && hashed.length > 0) {
    return hashed;
  }

  throw new Error("No se pudo generar el hash para el PIN solicitado.");
}

export async function compare(
  pin: string,
  hashed: string,
  sql = getSqlClient(),
): Promise<boolean> {
  const rows = normalizeRows<{ matches?: unknown }>(
    await sql`
      SELECT crypt(${pin}, ${hashed}) = ${hashed} AS matches
    `,
  );

  return rows[0]?.matches === true;
}

const bcrypt = { hash, compare } as const;

export default bcrypt;
