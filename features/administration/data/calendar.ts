import { unstable_noStore as noStore } from "next/cache";

import { getSqlClient, normalizeRows, SqlRow } from "@/lib/db/client";

export type CalendarKind = "exam" | "activity";

export type CalendarEvent = {
  id: number;
  kind: CalendarKind;
  title: string;
  startTime: string;
  endTime: string;
  status: string | null;
  notes: string | null;
  studentId: number | null;
  level: string | null;
  score: number | null;
  passed: boolean | null;
};

function coerceString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function coerceBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "t", "1", "yes", "y", "si", "sí"].includes(normalized)) {
      return true;
    }
    if (["false", "f", "0", "no", "n"].includes(normalized)) {
      return false;
    }
  }
  return null;
}

function normalizeKind(value: unknown): CalendarKind | null {
  if (value === "exam" || value === "activity") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "exam" || normalized === "examen") return "exam";
    if (normalized === "activity" || normalized === "actividad") return "activity";
  }
  return null;
}

function mapCalendarRow(row: SqlRow): CalendarEvent | null {
  const kind = normalizeKind(row.kind);
  const idValue = coerceNumber(row.id);
  const start = coerceString(row.start_time);
  const end = coerceString(row.end_time);

  if (!kind || idValue == null || !start || !end) {
    return null;
  }

  const title = coerceString(row.title) ?? (kind === "exam" ? "Examen" : "Actividad");

  return {
    id: idValue,
    kind,
    title,
    startTime: new Date(start).toISOString(),
    endTime: new Date(end).toISOString(),
    status: coerceString(row.status),
    notes: coerceString(row.notes),
    studentId: coerceNumber(row.student_id),
    level: coerceString(row.level),
    score: coerceNumber(row.score),
    passed: coerceBoolean(row.passed),
  };
}

export type CalendarQuery = {
  start: string;
  end: string;
  kind?: CalendarKind;
  status?: string | null;
  studentId?: number | null;
};

export async function listCalendarEvents({
  start,
  end,
  kind,
  status,
  studentId,
}: CalendarQuery): Promise<CalendarEvent[]> {
  noStore();
  if (!start || !end) {
    throw new Error("El rango de fechas es obligatorio.");
  }

  const sql = getSqlClient();
  const values: unknown[] = [start, end];
  const whereClauses: string[] = [
    "start_time >= $1::timestamptz",
    "start_time < $2::timestamptz",
  ];

  let ensuresExamFilter = false;
  let parameterIndex = values.length;

  if (kind) {
    parameterIndex += 1;
    whereClauses.push(`v.kind = $${parameterIndex}`);
    values.push(kind);
    if (kind === "exam") {
      ensuresExamFilter = true;
    }
  }

  if (status && status.trim().length) {
    if (!ensuresExamFilter) {
      whereClauses.push("v.kind = 'exam'");
      ensuresExamFilter = true;
    }
    parameterIndex += 1;
    whereClauses.push(`v.status = $${parameterIndex}`);
    values.push(status);
  }

  if (studentId != null) {
    if (!ensuresExamFilter) {
      whereClauses.push("v.kind = 'exam'");
      ensuresExamFilter = true;
    }
    parameterIndex += 1;
    whereClauses.push(`v.student_id = $${parameterIndex}::bigint`);
    values.push(studentId);
  }

  const query = `
    SELECT
      v.kind,
      v.id,
      v.title,
      v.start_time,
      v.end_time,
      v.status,
      v.notes,
      v.student_id,
      v.score,
      v.passed,
      CASE WHEN v.kind = 'exam' THEN e.level ELSE NULL END AS level
    FROM public.calendar_events_v v
    LEFT JOIN public.exam_appointments e ON v.kind = 'exam' AND v.id = e.id
    WHERE ${whereClauses.join(" AND ")}
    ORDER BY v.start_time ASC, v.id ASC
  `;

  const rows = normalizeRows<SqlRow>(await sql.query(query, values));

  return rows
    .map(mapCalendarRow)
    .filter((event): event is CalendarEvent => Boolean(event));
}

type ExamMutationBase = {
  studentId: number;
  timeScheduled: string;
  status?: string | null;
  level?: string | null;
  score?: number | null;
  passed?: boolean | null;
  notes?: string | null;
};

function assertExamPayload(payload: ExamMutationBase) {
  if (!Number.isFinite(payload.studentId) || payload.studentId <= 0) {
    throw new Error("El estudiante es obligatorio.");
  }
  if (!payload.timeScheduled) {
    throw new Error("La fecha y hora del examen son obligatorias.");
  }
  const validTypes = ["Speaking", "Writing"];
  if (payload.status && !validTypes.includes(payload.status)) {
    throw new Error(`El tipo de examen debe ser Speaking o Writing.`);
  }
  const validLevels = ["A1", "A2", "B1", "B2", "C1"];
  if (payload.level && !validLevels.includes(payload.level)) {
    throw new Error(`El nivel debe ser uno de: ${validLevels.join(", ")}.`);
  }
  const normalizedStatus = payload.status?.trim().toLowerCase() ?? "scheduled";
  if (normalizedStatus === "completed" && payload.score != null) {
    if (payload.passed == null) {
      throw new Error(
        "Debe indicar si el estudiante aprobó cuando registra una nota para un examen completado.",
      );
    }
  }
}

export async function createExam(payload: ExamMutationBase): Promise<{ id: number }> {
  noStore();
  assertExamPayload(payload);

  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    INSERT INTO public.exam_appointments (student_id, time_scheduled, status, level, score, passed, notes)
    VALUES (
      ${payload.studentId}::bigint,
      ${payload.timeScheduled},
      ${payload.status ?? "scheduled"},
      ${payload.level ?? null},
      ${payload.score ?? null},
      ${payload.passed ?? null},
      ${payload.notes ?? null}
    )
    RETURNING id
  `);

  if (!rows.length) {
    throw new Error("No se pudo crear el examen.");
  }

  return { id: Number(rows[0].id) };
}

export type UpdateExamPayload = {
  timeScheduled?: string | null;
  status?: string | null;
  level?: string | null;
  score?: number | null;
  passed?: boolean | null;
  notes?: string | null;
};

export async function updateExam(
  examId: number,
  payload: UpdateExamPayload,
): Promise<void> {
  noStore();
  if (!Number.isFinite(examId) || examId <= 0) {
    throw new Error("Identificador de examen inválido.");
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  const addUpdate = (field: string, value: unknown) => {
    updates.push(`${field} = $${updates.length + 1}`);
    values.push(value);
  };

  if ("timeScheduled" in payload) {
    addUpdate("time_scheduled", payload.timeScheduled ?? null);
  }
  if ("status" in payload) {
    const validTypes = ["Speaking", "Writing"];
    if (payload.status && !validTypes.includes(payload.status)) {
      throw new Error(`El tipo de examen debe ser Speaking o Writing.`);
    }
    const normalizedStatus = payload.status?.trim().toLowerCase() ?? null;
    if (
      normalizedStatus === "completed" &&
      "score" in payload &&
      payload.score != null &&
      payload.passed == null
    ) {
      throw new Error(
        "Debe indicar si el estudiante aprobó cuando registra una nota para un examen completado.",
      );
    }
    addUpdate("status", payload.status ?? null);
  }
  if ("level" in payload) {
    const validLevels = ["A1", "A2", "B1", "B2", "C1"];
    if (payload.level && !validLevels.includes(payload.level)) {
      throw new Error(`El nivel debe ser uno de: ${validLevels.join(", ")}.`);
    }
    addUpdate("level", payload.level ?? null);
  }
  if ("score" in payload) {
    addUpdate("score", payload.score ?? null);
  }
  if ("passed" in payload) {
    addUpdate("passed", payload.passed ?? null);
  }
  if ("notes" in payload) {
    addUpdate("notes", payload.notes ?? null);
  }

  if (!updates.length) {
    return;
  }

  updates.push(`updated_at = NOW()`);
  values.push(examId);

  const sql = getSqlClient();
  const query = `
    UPDATE public.exam_appointments
    SET ${updates.join(", ")}
    WHERE id = $${values.length}::bigint
    RETURNING id
  `;

  const rows = normalizeRows<SqlRow>(await sql.query(query, values));

  if (!rows.length) {
    throw new Error("No se encontró el examen a actualizar.");
  }
}

export async function deleteExam(examId: number): Promise<void> {
  noStore();
  if (!Number.isFinite(examId) || examId <= 0) {
    throw new Error("Identificador de examen inválido.");
  }
  const sql = getSqlClient();
  await sql`
    DELETE FROM public.exam_appointments
    WHERE id = ${examId}::bigint
  `;
}

type ActivityMutationBase = {
  title: string;
  startTime: string;
  description?: string | null;
  kind?: string | null;
};

function assertActivityPayload(payload: ActivityMutationBase) {
  if (!payload.title || !payload.title.trim().length) {
    throw new Error("El título es obligatorio.");
  }
  if (!payload.startTime) {
    throw new Error("La fecha y hora de la actividad son obligatorias.");
  }
}

export async function createActivity(
  payload: ActivityMutationBase,
): Promise<{ id: number }> {
  noStore();
  assertActivityPayload(payload);
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    INSERT INTO public.activities (title, description, start_time, kind)
    VALUES (
      ${payload.title},
      ${payload.description ?? null},
      ${payload.startTime},
      ${payload.kind ?? "activity"}
    )
    RETURNING id
  `);

  if (!rows.length) {
    throw new Error("No se pudo crear la actividad.");
  }

  return { id: Number(rows[0].id) };
}

export type UpdateActivityPayload = {
  title?: string | null;
  description?: string | null;
  startTime?: string | null;
  kind?: string | null;
};

export async function updateActivity(
  activityId: number,
  payload: UpdateActivityPayload,
): Promise<void> {
  noStore();
  if (!Number.isFinite(activityId) || activityId <= 0) {
    throw new Error("Identificador de actividad inválido.");
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  const addUpdate = (field: string, value: unknown) => {
    updates.push(`${field} = $${updates.length + 1}`);
    values.push(value);
  };

  if ("title" in payload) {
    if (payload.title && !payload.title.trim().length) {
      throw new Error("El título es obligatorio.");
    }
    addUpdate("title", payload.title ?? null);
  }
  if ("description" in payload) {
    addUpdate("description", payload.description ?? null);
  }
  if ("startTime" in payload) {
    addUpdate("start_time", payload.startTime ?? null);
  }
  if ("kind" in payload) {
    addUpdate("kind", payload.kind ?? null);
  }

  if (!updates.length) {
    return;
  }

  updates.push(`updated_at = NOW()`);
  values.push(activityId);

  const sql = getSqlClient();
  const query = `
    UPDATE public.activities
    SET ${updates.join(", ")}
    WHERE id = $${values.length}::bigint
    RETURNING id
  `;

  const rows = normalizeRows<SqlRow>(await sql.query(query, values));

  if (!rows.length) {
    throw new Error("No se encontró la actividad a actualizar.");
  }
}

export async function deleteActivity(activityId: number): Promise<void> {
  noStore();
  if (!Number.isFinite(activityId) || activityId <= 0) {
    throw new Error("Identificador de actividad inválido.");
  }
  const sql = getSqlClient();
  await sql`
    DELETE FROM public.activities
    WHERE id = ${activityId}::bigint
  `;
}
