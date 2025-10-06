import { neon } from "@neondatabase/serverless";

const TIME_ZONE = "America/Guayaquil";
const SEARCH_PATH = "analytics, mart, public";

type SqlClient = ReturnType<typeof neon>;

type QueryFunction = SqlClient;

export async function createPanelGerencialClient(): Promise<QueryFunction> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL no está configurada");
  }

  const sql = neon(connectionString);
  await sql.unsafe(
    `SET search_path TO ${SEARCH_PATH}; SET TIME ZONE '${TIME_ZONE}';`,
  );
  return sql as SqlClient;
}

export { TIME_ZONE, SEARCH_PATH };
