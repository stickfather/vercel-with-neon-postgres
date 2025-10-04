import { unstable_noStore as noStore } from "next/cache";

import { getSqlClient, normalizeRows, SqlRow } from "@/lib/db/client";

export type BasicDetailFieldType =
  | "text"
  | "textarea"
  | "date"
  | "number"
  | "boolean"
  | "datetime";

export type StudentBasicDetails = {
  id: number;
  full_name: string | null;
  representative_name: string | null;
  representative_phone: string | null;
  representative_email: string | null;
  has_special_needs: boolean | null;
  contract_start: string | null;
  contract_end: string | null;
  frozen_start: string | null;
  frozen_end: string | null;
  current_level: string | null;
  planned_level_min: string | null;
  planned_level_max: string | null;
  is_online: boolean | null;
  status: string | null;
  last_seen_at: string | null;
  last_lesson_id: string | null;
  updated_at: string | null;
  created_at: string | null;
};

export type StudentBasicDetailFieldConfig = {
  key: keyof Omit<StudentBasicDetails, "id">;
  label: string;
  type: BasicDetailFieldType;
  editable: boolean;
};

export const STUDENT_BASIC_DETAIL_FIELDS: ReadonlyArray<StudentBasicDetailFieldConfig> = [
  { key: "full_name", label: "Nombre completo", type: "text", editable: true },
  {
    key: "representative_name",
    label: "Nombre del representante",
    type: "text",
    editable: true,
  },
  {
    key: "representative_phone",
    label: "Teléfono del representante",
    type: "text",
    editable: true,
  },
  {
    key: "representative_email",
    label: "Correo del representante",
    type: "text",
    editable: true,
  },
  {
    key: "has_special_needs",
    label: "Necesidades especiales",
    type: "boolean",
    editable: true,
  },
  {
    key: "contract_start",
    label: "Inicio de contrato",
    type: "date",
    editable: true,
  },
  {
    key: "contract_end",
    label: "Fin de contrato",
    type: "date",
    editable: true,
  },
  {
    key: "frozen_start",
    label: "Inicio de congelamiento",
    type: "date",
    editable: true,
  },
  {
    key: "frozen_end",
    label: "Fin de congelamiento",
    type: "date",
    editable: true,
  },
  { key: "current_level", label: "Nivel actual", type: "text", editable: true },
  {
    key: "planned_level_min",
    label: "Nivel planificado mínimo",
    type: "text",
    editable: true,
  },
  {
    key: "planned_level_max",
    label: "Nivel planificado máximo",
    type: "text",
    editable: true,
  },
  {
    key: "is_online",
    label: "Modalidad en línea",
    type: "boolean",
    editable: true,
  },
  { key: "status", label: "Estado", type: "text", editable: false },
  { key: "last_lesson_id", label: "Última lección", type: "text", editable: false },
  { key: "last_seen_at", label: "Última asistencia", type: "datetime", editable: false },
  { key: "updated_at", label: "Actualizado el", type: "datetime", editable: false },
  { key: "created_at", label: "Creado el", type: "datetime", editable: false },
];

export const EDITABLE_STUDENT_BASIC_DETAIL_KEYS: ReadonlyArray<
  (typeof STUDENT_BASIC_DETAIL_FIELDS)[number]["key"]
> = STUDENT_BASIC_DETAIL_FIELDS.filter((field) => field.editable).map((field) => field.key);

type NormalizedFieldValue<T extends BasicDetailFieldType> = T extends "boolean"
  ? boolean | null
  : string | null;

function normalizeFieldValue<T extends BasicDetailFieldType>(
  value: unknown,
  type: T,
): NormalizedFieldValue<T> {
  if (value == null) return null as NormalizedFieldValue<T>;

  if (type === "boolean") {
    if (typeof value === "boolean") return value as NormalizedFieldValue<T>;
    if (typeof value === "number") {
      if (value === 1) return true as NormalizedFieldValue<T>;
      if (value === 0) return false as NormalizedFieldValue<T>;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "t", "1", "yes", "y", "si", "sí"].includes(normalized))
        return true as NormalizedFieldValue<T>;
      if (["false", "f", "0", "no", "n"].includes(normalized))
        return false as NormalizedFieldValue<T>;
    }
    return null as NormalizedFieldValue<T>;
  }

  if (type === "date" || type === "datetime") {
    const date =
      value instanceof Date
        ? value
        : typeof value === "string" || typeof value === "number"
          ? new Date(value)
          : null;
    if (!date || Number.isNaN(date.getTime())) return null as NormalizedFieldValue<T>;
    if (type === "date") {
      return date.toISOString().slice(0, 10) as NormalizedFieldValue<T>;
    }
    const iso = date.toISOString();
    return `${iso.slice(0, 10)} ${iso.slice(11, 16)}` as NormalizedFieldValue<T>;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null as NormalizedFieldValue<T>;
    return String(value) as NormalizedFieldValue<T>;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return (trimmed.length ? trimmed : null) as NormalizedFieldValue<T>;
  }

  if (value instanceof Date) {
    return value.toISOString() as NormalizedFieldValue<T>;
  }

  return null as NormalizedFieldValue<T>;
}

function mapRowToStudentBasicDetails(row: SqlRow, fallbackId: number): StudentBasicDetails {
  return {
    id: Number(row.id ?? fallbackId),
    full_name: normalizeFieldValue(row.full_name, "text"),
    representative_name: normalizeFieldValue(row.representative_name, "text"),
    representative_phone: normalizeFieldValue(row.representative_phone, "text"),
    representative_email: normalizeFieldValue(row.representative_email, "text"),
    has_special_needs: normalizeFieldValue(row.has_special_needs, "boolean"),
    contract_start: normalizeFieldValue(row.contract_start, "date"),
    contract_end: normalizeFieldValue(row.contract_end, "date"),
    frozen_start: normalizeFieldValue(row.frozen_start, "date"),
    frozen_end: normalizeFieldValue(row.frozen_end, "date"),
    current_level: normalizeFieldValue(row.current_level, "text"),
    planned_level_min: normalizeFieldValue(row.planned_level_min, "text"),
    planned_level_max: normalizeFieldValue(row.planned_level_max, "text"),
    is_online: normalizeFieldValue(row.is_online, "boolean"),
    status: normalizeFieldValue(row.status, "text"),
    last_seen_at: normalizeFieldValue(row.last_seen_at, "datetime"),
    last_lesson_id: normalizeFieldValue(row.last_lesson_id, "text"),
    updated_at: normalizeFieldValue(row.updated_at, "datetime"),
    created_at: normalizeFieldValue(row.created_at, "datetime"),
  };
}

export async function getStudentBasicDetails(studentId: number): Promise<StudentBasicDetails | null> {
  noStore();
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT
      id,
      full_name,
      representative_name,
      representative_phone,
      representative_email,
      has_special_needs,
      contract_start,
      contract_end,
      frozen_start,
      frozen_end,
      current_level,
      planned_level_min,
      planned_level_max,
      is_online,
      status,
      last_seen_at,
      last_lesson_id,
      updated_at,
      created_at
    FROM public.students
    WHERE id = ${studentId}::bigint
    LIMIT 1
  `);

  if (!rows.length) return null;

  return mapRowToStudentBasicDetails(rows[0], studentId);
}

export type StudentBasicDetailsEditablePayload = Partial<
  Pick<StudentBasicDetails, (typeof EDITABLE_STUDENT_BASIC_DETAIL_KEYS)[number]>
>;

export async function updateStudentBasicDetails(
  studentId: number,
  payload: StudentBasicDetailsEditablePayload,
): Promise<StudentBasicDetails> {
  noStore();
  const sql = getSqlClient();

  const allowedKeys = new Set<string>(EDITABLE_STUDENT_BASIC_DETAIL_KEYS as string[]);
  const entries = Object.entries(payload).filter(([, value]) => value !== undefined);
  const sanitizedEntries = entries.filter(([key]) => allowedKeys.has(key));

  if (!sanitizedEntries.length) {
    throw new Error("No se proporcionaron cambios para actualizar.");
  }

  const setFragments = sanitizedEntries.map(
    ([key], index) => `"${key}" = $${index + 1}`,
  );
  setFragments.push("updated_at = NOW()");

  const values = sanitizedEntries.map(([, value]) => value ?? null);
  const query = `
    UPDATE public.students
    SET ${setFragments.join(", ")}
    WHERE id = $${values.length + 1}::bigint
    RETURNING
      id,
      full_name,
      representative_name,
      representative_phone,
      representative_email,
      has_special_needs,
      contract_start,
      contract_end,
      frozen_start,
      frozen_end,
      current_level,
      planned_level_min,
      planned_level_max,
      is_online,
      status,
      last_seen_at,
      last_lesson_id,
      updated_at,
      created_at
  `;

  const rows = normalizeRows<SqlRow>(
    await sql.query(query, [...values, studentId]),
  );

  if (!rows.length) {
    throw new Error("No se pudo actualizar la información del estudiante.");
  }

  return mapRowToStudentBasicDetails(rows[0], studentId);
}

export type StudentPaymentScheduleEntry = {
  id: number;
  studentId: number;
  dueDate: string | null;
  amount: number | null;
  isPaid: boolean;
  receivedDate: string | null;
  note: string | null;
};

function mapPaymentScheduleRow(
  row: SqlRow,
  fallbackStudentId: number,
): StudentPaymentScheduleEntry {
  const isPaidValue = normalizeFieldValue(row.is_paid, "boolean");
  const dueDateValue = normalizeFieldValue(row.due_date, "date");
  const receivedDateValue = normalizeFieldValue(row.received_date, "date");
  const noteValue = normalizeFieldValue(row.note, "text");

  return {
    id: Number(row.id),
    studentId: Number(row.student_id ?? fallbackStudentId),
    dueDate: typeof dueDateValue === "string" ? dueDateValue : null,
    amount:
      row.amount == null
        ? null
        : typeof row.amount === "number"
          ? row.amount
          : Number(row.amount),
    isPaid: typeof isPaidValue === "boolean" ? isPaidValue : false,
    receivedDate: typeof receivedDateValue === "string" ? receivedDateValue : null,
    note: typeof noteValue === "string" ? noteValue : null,
  };
}

export async function listStudentPaymentSchedule(
  studentId: number,
): Promise<StudentPaymentScheduleEntry[]> {
  noStore();
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT id, student_id, due_date, amount, is_paid, received_date, note
    FROM public.student_payment_schedule
    WHERE student_id = ${studentId}::bigint
    ORDER BY due_date ASC NULLS LAST, id ASC
  `);

  return rows.map((row) => mapPaymentScheduleRow(row, studentId));
}

export async function createPaymentScheduleEntry(
  studentId: number,
  data: {
    dueDate: string | null;
    amount: number | null;
    isPaid?: boolean | null;
    receivedDate?: string | null;
    note?: string | null;
  },
): Promise<StudentPaymentScheduleEntry> {
  noStore();
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    INSERT INTO public.student_payment_schedule (
      student_id,
      due_date,
      amount,
      is_paid,
      received_date,
      note
    )
    VALUES (
      ${studentId}::bigint,
      ${data.dueDate},
      ${data.amount},
      ${data.isPaid ?? false},
      ${data.receivedDate ?? null},
      ${data.note ?? null}
    )
    RETURNING id, student_id, due_date, amount, is_paid, received_date, note
  `);

  if (!rows.length) {
    throw new Error("No se pudo crear el cronograma de pagos.");
  }

  return mapPaymentScheduleRow(rows[0], studentId);
}

export async function updatePaymentScheduleEntry(
  entryId: number,
  data: {
    dueDate: string | null;
    amount: number | null;
    isPaid: boolean;
    receivedDate: string | null;
    note: string | null;
  },
): Promise<StudentPaymentScheduleEntry> {
  noStore();
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    UPDATE public.student_payment_schedule
    SET due_date = ${data.dueDate},
      amount = ${data.amount},
      is_paid = ${data.isPaid},
      received_date = ${data.receivedDate},
      note = ${data.note}
    WHERE id = ${entryId}::bigint
    RETURNING id, student_id, due_date, amount, is_paid, received_date, note
  `);

  if (!rows.length) {
    throw new Error("No se pudo actualizar el cronograma de pagos.");
  }

  return mapPaymentScheduleRow(rows[0], Number(rows[0].student_id ?? 0));
}

export async function deletePaymentScheduleEntry(
  entryId: number,
): Promise<StudentPaymentScheduleEntry | null> {
  noStore();
  const sql = getSqlClient();
  const rows = normalizeRows<SqlRow>(await sql`
    DELETE FROM public.student_payment_schedule
    WHERE id = ${entryId}::bigint
    RETURNING id, student_id, due_date, amount, is_paid, received_date, note
  `);

  if (!rows.length) {
    return null;
  }

  return mapPaymentScheduleRow(rows[0], Number(rows[0].student_id ?? 0));
}

export type StudentNote = {
  id: number;
  studentId: number;
  note: string;
  createdAt: string | null;
};

export async function listStudentNotes(studentId: number): Promise<StudentNote[]> {
  noStore();
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT id, student_id, note, created_at
    FROM public.student_notes
    WHERE student_id = ${studentId}::bigint
    ORDER BY created_at DESC NULLS LAST, id DESC
  `);

  return rows.map((row) => ({
    id: Number(row.id),
    studentId: Number(row.student_id ?? studentId),
    note: ((row.note as string | null) ?? "").trim(),
    createdAt: normalizeFieldValue(row.created_at, "datetime"),
  }));
}

export async function createStudentNote(
  studentId: number,
  data: { note: string },
): Promise<StudentNote> {
  noStore();
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    INSERT INTO public.student_notes (student_id, note)
    VALUES (${studentId}::bigint, ${data.note})
    RETURNING id, student_id, note, created_at
  `);

  if (!rows.length) {
    throw new Error("No se pudo crear la nota.");
  }

  const row = rows[0];
  return {
    id: Number(row.id),
    studentId: Number(row.student_id ?? studentId),
    note: ((row.note as string | null) ?? "").trim(),
    createdAt: normalizeFieldValue(row.created_at, "datetime"),
  };
}

export async function updateStudentNote(
  noteId: number,
  data: { note: string },
): Promise<StudentNote> {
  noStore();
  const sql = getSqlClient();
  const rows = normalizeRows<SqlRow>(await sql`
    UPDATE public.student_notes
    SET note = ${data.note}
    WHERE id = ${noteId}::bigint
    RETURNING id, student_id, note, created_at
  `);

  if (!rows.length) {
    throw new Error("No se pudo actualizar la nota.");
  }

  const row = rows[0];
  return {
    id: Number(row.id),
    studentId: Number(row.student_id ?? 0),
    note: ((row.note as string | null) ?? "").trim(),
    createdAt: normalizeFieldValue(row.created_at, "datetime"),
  };
}

export async function deleteStudentNote(noteId: number): Promise<StudentNote | null> {
  noStore();
  const sql = getSqlClient();
  const rows = normalizeRows<SqlRow>(await sql`
    DELETE FROM public.student_notes
    WHERE id = ${noteId}::bigint
    RETURNING id, student_id, note, created_at
  `);

  if (!rows.length) {
    return null;
  }

  const row = rows[0];
  return {
    id: Number(row.id),
    studentId: Number(row.student_id ?? 0),
    note: ((row.note as string | null) ?? "").trim(),
    createdAt: normalizeFieldValue(row.created_at, "datetime"),
  };
}

export type StudentExam = {
  id: number;
  studentId: number;
  timeScheduled: string | null;
  status: string | null;
  score: number | null;
  passed: boolean;
  notes: string | null;
};

function mapExamRow(row: SqlRow, fallbackStudentId: number): StudentExam {
  const passedValue = normalizeFieldValue(row.passed, "boolean");
  return {
    id: Number(row.id),
    studentId: Number(row.student_id ?? fallbackStudentId),
    timeScheduled: normalizeFieldValue(row.time_scheduled, "datetime"),
    status: normalizeFieldValue(row.status, "text"),
    score:
      row.score == null
        ? null
        : typeof row.score === "number"
          ? row.score
          : Number(row.score),
    passed: typeof passedValue === "boolean" ? passedValue : false,
    notes: normalizeFieldValue(row.notes, "text"),
  };
}

export async function listStudentExams(studentId: number): Promise<StudentExam[]> {
  noStore();
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT id, student_id, time_scheduled, status, score, passed, notes
    FROM public.exam_appointments
    WHERE student_id = ${studentId}::bigint
    ORDER BY time_scheduled DESC NULLS LAST, id DESC
  `);

  return rows.map((row) => mapExamRow(row, studentId));
}

export async function createStudentExam(
  studentId: number,
  data: {
    timeScheduled: string | null;
    status: string | null;
    score: number | null;
    passed: boolean;
    notes: string | null;
  },
): Promise<StudentExam> {
  noStore();
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    INSERT INTO public.exam_appointments (student_id, time_scheduled, status, score, passed, notes)
    VALUES (
      ${studentId}::bigint,
      ${data.timeScheduled},
      ${data.status ?? "scheduled"},
      ${data.score},
      ${data.passed},
      ${data.notes}
    )
    RETURNING id, student_id, time_scheduled, status, score, passed, notes
  `);

  if (!rows.length) {
    throw new Error("No se pudo crear el examen.");
  }

  return mapExamRow(rows[0], studentId);
}

export async function updateStudentExam(
  examId: number,
  data: {
    timeScheduled: string | null;
    status: string | null;
    score: number | null;
    passed: boolean;
    notes: string | null;
  },
): Promise<StudentExam> {
  noStore();
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    UPDATE public.exam_appointments
    SET time_scheduled = ${data.timeScheduled},
      status = ${data.status},
      score = ${data.score},
      passed = ${data.passed},
      notes = ${data.notes}
    WHERE id = ${examId}::bigint
    RETURNING id, student_id, time_scheduled, status, score, passed, notes
  `);

  if (!rows.length) {
    throw new Error("No se pudo actualizar el examen.");
  }

  return mapExamRow(rows[0], Number(rows[0].student_id ?? 0));
}

export async function deleteStudentExam(examId: number): Promise<StudentExam | null> {
  noStore();
  const sql = getSqlClient();
  const rows = normalizeRows<SqlRow>(await sql`
    DELETE FROM public.exam_appointments
    WHERE id = ${examId}::bigint
    RETURNING id, student_id, time_scheduled, status, score, passed, notes
  `);

  if (!rows.length) {
    return null;
  }

  return mapExamRow(rows[0], Number(rows[0].student_id ?? 0));
}

export type StudentInstructivo = {
  id: number;
  studentId: number;
  title: string;
  content: string;
  note: string | null;
  createdBy: string | null;
  createdAt: string | null;
};

function mapInstructivoRow(
  row: SqlRow,
  fallbackStudentId: number,
): StudentInstructivo {
  return {
    id: Number(row.id),
    studentId: Number(row.student_id ?? fallbackStudentId),
    title: normalizeFieldValue(row.title, "text") ?? "",
    content: normalizeFieldValue(row.content, "text") ?? "",
    note: normalizeFieldValue(row.note, "text"),
    createdBy: normalizeFieldValue(row.created_by, "text"),
    createdAt: normalizeFieldValue(row.created_at, "datetime"),
  };
}

export async function listStudentInstructivos(
  studentId: number,
): Promise<StudentInstructivo[]> {
  noStore();
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT id, student_id, title, content, note, created_by, created_at
    FROM public.student_instructivos
    WHERE student_id = ${studentId}::bigint
    ORDER BY created_at DESC NULLS LAST, id DESC
  `);

  return rows.map((row) => mapInstructivoRow(row, studentId));
}

export async function createStudentInstructivo(
  studentId: number,
  data: {
    title: string;
    content: string;
    note?: string | null;
    createdBy?: string | null;
  },
): Promise<StudentInstructivo> {
  noStore();
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    INSERT INTO public.student_instructivos (student_id, title, content, note, created_by)
    VALUES (
      ${studentId}::bigint,
      ${data.title},
      ${data.content},
      ${data.note ?? null},
      ${data.createdBy ?? null}
    )
    RETURNING id, student_id, title, content, note, created_by, created_at
  `);

  if (!rows.length) {
    throw new Error("No se pudo crear el instructivo.");
  }

  return mapInstructivoRow(rows[0], studentId);
}

export async function updateStudentInstructivo(
  instructivoId: number,
  data: {
    title: string;
    content: string;
    note: string | null;
    createdBy: string | null;
  },
): Promise<StudentInstructivo> {
  noStore();
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    UPDATE public.student_instructivos
    SET title = ${data.title},
      content = ${data.content},
      note = ${data.note},
      created_by = ${data.createdBy}
    WHERE id = ${instructivoId}::bigint
    RETURNING id, student_id, title, content, note, created_by, created_at
  `);

  if (!rows.length) {
    throw new Error("No se pudo actualizar el instructivo.");
  }

  return mapInstructivoRow(rows[0], Number(rows[0].student_id ?? 0));
}

export async function deleteStudentInstructivo(
  instructivoId: number,
): Promise<StudentInstructivo | null> {
  noStore();
  const sql = getSqlClient();
  const rows = normalizeRows<SqlRow>(await sql`
    DELETE FROM public.student_instructivos
    WHERE id = ${instructivoId}::bigint
    RETURNING id, student_id, title, content, note, created_by, created_at
  `);

  if (!rows.length) {
    return null;
  }

  return mapInstructivoRow(rows[0], Number(rows[0].student_id ?? 0));
}

function normalizeNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.length) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeInteger(value: unknown): number | null {
  const parsed = normalizeNumber(value);
  if (parsed == null) return null;
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function normalizeString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return String(value);
  }
  return null;
}

function isIsoSunday(date: string): boolean {
  if (!date) return false;
  const normalized = date.includes("T") ? date : `${date}T00:00:00Z`;
  const parsed = Date.parse(normalized);
  if (Number.isNaN(parsed)) {
    return false;
  }
  const weekday = new Date(parsed).getUTCDay();
  const isoDay = weekday === 0 ? 7 : weekday;
  return isoDay === 7;
}

export type StudentProgressStats = {
  averageSessionLengthMinutes: number | null;
  averageDaysPerWeek: number | null;
  averageProgressPerWeek: number | null;
  lessonsPerWeek: number | null;
};

export type StudentAttendanceStats = {
  totalMinutes: number | null;
  totalHours: number | null;
  averageSessionMinutes: number | null;
  averageSessionsPerDay: number | null;
  averageMinutesPerDay: number | null;
  averageMinutesPerDayExcludingSundays: number | null;
  lessonChanges: number | null;
  lessonsPerWeek: number | null;
};

export type MinutesByDayEntry = {
  date: string;
  minutes: number;
};

export type CumulativeHoursEntry = {
  date: string;
  hours: number;
};

export type LessonTimelineEntry = {
  date: string;
  lessonId: string | null;
  lessonLabel: string | null;
};

export type StudentProgressEvent = {
  occurredAt: string;
  description: string | null;
  fromLessonLabel: string | null;
  toLessonLabel: string | null;
};

export async function getStudentProgressStats(
  studentId: number,
  startDate: string,
  endDate: string,
  excludeSundays: boolean,
): Promise<StudentProgressStats> {
  noStore();
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT *
    FROM public.get_student_progress_stats(${studentId}::bigint, ${startDate}, ${endDate}, ${excludeSundays})
    LIMIT 1
  `);

  if (!rows.length) {
    return {
      averageSessionLengthMinutes: null,
      averageDaysPerWeek: null,
      averageProgressPerWeek: null,
      lessonsPerWeek: null,
    };
  }

  const row = rows[0];
  const avgSession = row.average_session_length_minutes ?? row.avg_session_length_minutes ?? row.avg_session_length ?? null;
  const avgDays = row.average_days_per_week ?? row.avg_days_per_week ?? null;
  const avgProgress = row.average_rate_of_progress_per_week ?? row.avg_progress_per_week ?? row.average_progress_per_week ?? null;
  const lessonsPerWeek = row.lessons_per_week ?? row.avg_lessons_per_week ?? row.lessons_per_week_30d ?? null;

  return {
    averageSessionLengthMinutes: normalizeNumber(avgSession),
    averageDaysPerWeek: normalizeNumber(avgDays),
    averageProgressPerWeek: normalizeNumber(avgProgress),
    lessonsPerWeek: normalizeNumber(lessonsPerWeek),
  };
}

export async function getStudentMinutesByDay(
  studentId: number,
  startDate: string,
  endDate: string,
  excludeSundays: boolean,
): Promise<MinutesByDayEntry[]> {
  noStore();
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT *
    FROM public.get_student_minutes_by_day(${studentId}::bigint, ${startDate}, ${endDate}, ${excludeSundays})
  `);

  return rows
    .map((row) => ({
      date: normalizeFieldValue(row.date ?? row.day ?? row.session_date, "date") ?? "",
      minutes:
        row.minutes == null
          ? 0
          : typeof row.minutes === "number"
            ? row.minutes
            : Number(row.minutes),
    }))
    .filter((entry) => entry.date.length > 0 && (!excludeSundays || !isIsoSunday(entry.date)));
}

export async function getStudentCumulativeHours(
  studentId: number,
  startDate: string,
  endDate: string,
): Promise<CumulativeHoursEntry[]> {
  noStore();
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT *
    FROM public.get_student_cumulative_hours(${studentId}::bigint, ${startDate}, ${endDate})
  `);

  return rows
    .map((row) => ({
      date: normalizeFieldValue(row.date ?? row.day ?? row.session_date, "date") ?? "",
      hours:
        row.hours == null
          ? 0
          : typeof row.hours === "number"
            ? row.hours
            : Number(row.hours),
    }))
    .filter((entry) => entry.date.length > 0);
}

export async function getStudentLessonTimeline(
  studentId: number,
  startDate: string,
  endDate: string,
): Promise<LessonTimelineEntry[]> {
  noStore();
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT *
    FROM public.get_student_daily_lesson(${studentId}::bigint, ${startDate}, ${endDate})
  `);

  return rows
    .map((row) => ({
      date: normalizeFieldValue(row.date ?? row.day ?? row.session_date, "date") ?? "",
      lessonId: normalizeString(row.lesson_id ?? row.lessonid ?? row.lesson ?? null),
      lessonLabel:
        normalizeString(row.lesson_label ?? row.lesson_name ?? row.lesson ?? null) ??
        normalizeString(row.level ?? row.lesson_level ?? null),
    }))
    .filter((entry) => entry.date.length > 0);
}

export async function getStudentAttendanceStats(
  studentId: number,
  startDate: string,
  endDate: string,
): Promise<StudentAttendanceStats> {
  noStore();
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT *
    FROM public.get_student_attendance_stats(${studentId}::bigint, ${startDate}, ${endDate})
    LIMIT 1
  `);

  if (!rows.length) {
    return {
      totalMinutes: null,
      totalHours: null,
      averageSessionMinutes: null,
      averageSessionsPerDay: null,
      averageMinutesPerDay: null,
      averageMinutesPerDayExcludingSundays: null,
      lessonChanges: null,
      lessonsPerWeek: null,
    };
  }

  const row = rows[0];

  const totalMinutes = row.total_minutes ?? row.total_mins ?? row.total_minutes_in_range ?? null;
  const totalHours = row.total_hours ?? row.total_hours_in_range ?? null;
  const avgSession =
    row.avg_session_minutes ??
    row.average_session_minutes ??
    row.avg_session_length_minutes ??
    row.avg_session_length ??
    null;
  const avgSessionsPerDay = row.avg_sessions_per_day ?? row.average_sessions_per_day ?? null;
  const avgMinutesPerDay = row.avg_minutes_per_day ?? row.average_minutes_per_day ?? null;
  const avgMinutesPerDayExclSun =
    row.avg_minutes_per_day_excl_sun ??
    row.avg_minutes_per_day_without_sundays ??
    row.average_minutes_per_day_excl_sundays ??
    null;
  const lessonChanges = row.lesson_changes ?? row.lesson_change_count ?? row.total_lesson_changes ?? null;
  const lessonsPerWeek =
    row.lessons_per_week_30d ??
    row.lessons_per_week ??
    row.avg_lessons_per_week ??
    row.lessons_per_week_recent ??
    null;

  return {
    totalMinutes: normalizeNumber(totalMinutes),
    totalHours: normalizeNumber(totalHours),
    averageSessionMinutes: normalizeNumber(avgSession),
    averageSessionsPerDay: normalizeNumber(avgSessionsPerDay),
    averageMinutesPerDay: normalizeNumber(avgMinutesPerDay),
    averageMinutesPerDayExcludingSundays: normalizeNumber(avgMinutesPerDayExclSun),
    lessonChanges: normalizeInteger(lessonChanges),
    lessonsPerWeek: normalizeNumber(lessonsPerWeek),
  };
}

export async function getStudentProgressEvents(
  studentId: number,
): Promise<StudentProgressEvent[]> {
  noStore();
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT *
    FROM public.get_student_progress_events(${studentId}::bigint)
  `);

  return rows
    .map((row) => {
      const occurredAt =
        normalizeFieldValue(row.event_time ?? row.occurred_at ?? row.recorded_at, "datetime") ?? "";

      return {
        occurredAt,
        description:
          normalizeString(row.description ?? row.event_label ?? row.event ?? row.change_type ?? null),
        fromLessonLabel:
          normalizeString(row.from_lesson ?? row.previous_lesson ?? row.previous_lesson_label ?? null),
        toLessonLabel:
          normalizeString(row.to_lesson ?? row.next_lesson ?? row.lesson_label ?? row.new_lesson_label ?? null),
      };
    })
    .filter((entry) => entry.occurredAt.length > 0);
}
