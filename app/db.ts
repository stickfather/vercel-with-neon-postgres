import { neon } from "@neondatabase/serverless";

let sqlInstance: ReturnType<typeof neon> | null = null;

function getSqlClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("No DATABASE_URL environment variable");
  }
  if (!sqlInstance) {
    sqlInstance = neon(connectionString);
  }
  return sqlInstance;
}

export type Student = {
  id: number;
  full_name: string;
  representative_name: string | null;
  representative_phone: string | null;
  status_text: string | null;
  special_needs: boolean | null;
  planned_level_min: string | null;
  planned_level_max: string | null;
};

export async function fetchStudents(): Promise<Student[]> {
  const sql = getSqlClient();

  const rows = await sql`
    SELECT
      id,
      full_name,
      representative_name,
      representative_phone,
      status_text,
      special_needs,
      planned_level_min,
      planned_level_max
    FROM students
    ORDER BY full_name ASC
  `;

  return rows as Student[];
}
