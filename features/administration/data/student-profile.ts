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
  studentId: number;
  fullName: string | null;
  photoUrl: string | null;
  photoUpdatedAt: string | null;
  representativeName: string | null;
  representativePhone: string | null;
  representativeEmail: string | null;
  contractStart: string | null;
  contractEnd: string | null;
  frozenStart: string | null;
  frozenEnd: string | null;
  currentLevel: string | null;
  plannedLevelMin: string | null;
  plannedLevelMax: string | null;
  hasSpecialNeeds: boolean | null;
  isOnline: boolean | null;
  isNewStudent: boolean | null;
  isExamApproaching: boolean | null;
  isExamPreparation: boolean | null;
  isAbsent7d: boolean | null;
  isAbsent7Days: boolean | null;
  isSlowProgress14d: boolean | null;
  isSlowProgress14Days: boolean | null;
  instructivoActive: boolean | null;
  hasActiveInstructive: boolean | null;
  instructivoOverdue: boolean | null;
  hasOverdueInstructive: boolean | null;
  status: string | null;
  lastSeenAt: string | null;
  lastLessonId: string | null;
  updatedAt: string | null;
  createdAt: string | null;
};

export type StudentBasicDetailFieldConfig = {
  key: keyof Omit<StudentBasicDetails, "studentId">;
  dbColumn: keyof StudentBasicDetails;
  label: string;
  type: BasicDetailFieldType;
  editable: boolean;
};

export const STUDENT_BASIC_DETAIL_FIELDS: ReadonlyArray<StudentBasicDetailFieldConfig> = [
  {
    key: "fullName",
    dbColumn: "fullName",
    label: "Nombre completo",
    type: "text",
    editable: true,
  },
  {
    key: "representativeName",
    dbColumn: "representativeName",
    label: "Nombre del representante",
    type: "text",
    editable: true,
  },
  {
    key: "representativePhone",
    dbColumn: "representativePhone",
    label: "Teléfono del representante",
    type: "text",
    editable: true,
  },
  {
    key: "representativeEmail",
    dbColumn: "representativeEmail",
    label: "Correo del representante",
    type: "text",
    editable: true,
  },
  {
    key: "contractStart",
    dbColumn: "contractStart",
    label: "Inicio de contrato",
    type: "date",
    editable: true,
  },
  {
    key: "contractEnd",
    dbColumn: "contractEnd",
    label: "Fin de contrato",
    type: "date",
    editable: true,
  },
  {
    key: "frozenStart",
    dbColumn: "frozenStart",
    label: "Inicio de congelamiento",
    type: "date",
    editable: true,
  },
  {
    key: "frozenEnd",
    dbColumn: "frozenEnd",
    label: "Fin de congelamiento",
    type: "date",
    editable: true,
  },
  {
    key: "currentLevel",
    dbColumn: "currentLevel",
    label: "Nivel actual",
    type: "text",
    editable: true,
  },
  {
    key: "plannedLevelMin",
    dbColumn: "plannedLevelMin",
    label: "Nivel planificado mínimo",
    type: "text",
    editable: true,
  },
  {
    key: "plannedLevelMax",
    dbColumn: "plannedLevelMax",
    label: "Nivel planificado máximo",
    type: "text",
    editable: true,
  },
  {
    key: "hasSpecialNeeds",
    dbColumn: "hasSpecialNeeds",
    label: "Necesidades especiales",
    type: "boolean",
    editable: true,
  },
  {
    key: "isOnline",
    dbColumn: "isOnline",
    label: "Modalidad en línea",
    type: "boolean",
    editable: true,
  },
  {
    key: "lastLessonId",
    dbColumn: "lastLessonId",
    label: "Última lección",
    type: "text",
    editable: false,
  },
  {
    key: "lastSeenAt",
    dbColumn: "lastSeenAt",
    label: "Última asistencia",
    type: "datetime",
    editable: false,
  },
  {
    key: "updatedAt",
    dbColumn: "updatedAt",
    label: "Actualizado el",
    type: "datetime",
    editable: false,
  },
  {
    key: "createdAt",
    dbColumn: "createdAt",
    label: "Creado el",
    type: "datetime",
    editable: false,
  },
];

const STUDENT_BASIC_DETAIL_COLUMN_MAP = {
  fullName: "full_name",
  representativeName: "representative_name",
  representativePhone: "representative_phone",
  representativeEmail: "representative_email",
  hasSpecialNeeds: "has_special_needs",
  contractStart: "contract_start",
  contractEnd: "contract_end",
  frozenStart: "frozen_start",
  frozenEnd: "frozen_end",
  currentLevel: "current_level",
  plannedLevelMin: "planned_level_min",
  plannedLevelMax: "planned_level_max",
  isOnline: "is_online",
} as const;

type StudentBasicDetailEditableKey = keyof typeof STUDENT_BASIC_DETAIL_COLUMN_MAP;

export const EDITABLE_STUDENT_BASIC_DETAIL_KEYS: ReadonlyArray<
  StudentBasicDetailEditableKey
> = STUDENT_BASIC_DETAIL_FIELDS.filter((field) => field.editable).map(
  (field) => field.key as StudentBasicDetailEditableKey,
);

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
    studentId: Number(row.studentId ?? fallbackId),
    fullName: normalizeFieldValue(row.fullName, "text"),
    photoUrl: typeof row.photoUrl === "string" && row.photoUrl.length
      ? row.photoUrl
      : null,
    photoUpdatedAt: normalizeFieldValue(row.photoUpdatedAt, "datetime"),
    representativeName: normalizeFieldValue(row.representativeName, "text"),
    representativePhone: normalizeFieldValue(row.representativePhone, "text"),
    representativeEmail: normalizeFieldValue(row.representativeEmail, "text"),
    contractStart: normalizeFieldValue(row.contractStart, "date"),
    contractEnd: normalizeFieldValue(row.contractEnd, "date"),
    frozenStart: normalizeFieldValue(row.frozenStart, "date"),
    frozenEnd: normalizeFieldValue(row.frozenEnd, "date"),
    currentLevel: normalizeFieldValue(row.currentLevel, "text"),
    plannedLevelMin: normalizeFieldValue(row.plannedLevelMin, "text"),
    plannedLevelMax: normalizeFieldValue(row.plannedLevelMax, "text"),
    hasSpecialNeeds: normalizeFieldValue(row.hasSpecialNeeds, "boolean"),
    isOnline: normalizeFieldValue(row.isOnline, "boolean"),
    isNewStudent: normalizeFieldValue(row.isNewStudent, "boolean"),
    isExamApproaching: normalizeFieldValue(row.isExamApproaching, "boolean"),
    isExamPreparation: normalizeFieldValue(row.isExamPreparation, "boolean"),
    isAbsent7d: normalizeFieldValue(row.isAbsent7d ?? row.isAbsent7Days, "boolean"),
    isAbsent7Days: normalizeFieldValue(row.isAbsent7Days ?? row.isAbsent7d, "boolean"),
    isSlowProgress14d: normalizeFieldValue(row.isSlowProgress14d ?? row.isSlowProgress14Days, "boolean"),
    isSlowProgress14Days: normalizeFieldValue(row.isSlowProgress14Days ?? row.isSlowProgress14d, "boolean"),
    instructivoActive: normalizeFieldValue(row.instructivoActive ?? row.hasActiveInstructive, "boolean"),
    hasActiveInstructive: normalizeFieldValue(row.hasActiveInstructive ?? row.instructivoActive, "boolean"),
    instructivoOverdue: normalizeFieldValue(row.instructivoOverdue ?? row.hasOverdueInstructive, "boolean"),
    hasOverdueInstructive: normalizeFieldValue(row.hasOverdueInstructive ?? row.instructivoOverdue, "boolean"),
    status: normalizeFieldValue(row.status, "text"),
    lastSeenAt: normalizeFieldValue(row.lastSeenAt, "datetime"),
    lastLessonId: normalizeFieldValue(row.lastLessonId, "text"),
    updatedAt: normalizeFieldValue(row.updatedAt, "datetime"),
    createdAt: normalizeFieldValue(row.createdAt, "datetime"),
  };
}

export async function getStudentBasicDetails(studentId: number): Promise<StudentBasicDetails | null> {
  noStore();
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT
      s.id                                   AS "studentId",
      s.full_name                            AS "fullName",
      s.photo_url                            AS "photoUrl",
      s.photo_updated_at                     AS "photoUpdatedAt",
      s.representative_name                  AS "representativeName",
      s.representative_phone                 AS "representativePhone",
      s.representative_email                 AS "representativeEmail",
      s.has_special_needs                    AS "hasSpecialNeeds",
      s.contract_start                       AS "contractStart",
      s.contract_end                         AS "contractEnd",
      s.frozen_start                         AS "frozenStart",
      s.frozen_end                           AS "frozenEnd",
      s.current_level::text                  AS "currentLevel",
      s.planned_level_min::text              AS "plannedLevelMin",
      s.planned_level_max::text              AS "plannedLevelMax",
      COALESCE(s.is_online, false)           AS "isOnline",
      COALESCE(sf.is_new_student, false)     AS "isNewStudent",
      COALESCE(sf.is_exam_approaching, false) AS "isExamApproaching",
      COALESCE(sf.is_exam_preparation, false) AS "isExamPreparation",
      COALESCE(sf.is_absent_7d, false)       AS "isAbsent7d",
      COALESCE(sf.is_absent_7d, false)       AS "isAbsent7Days",
      COALESCE(sf.is_slow_progress_14d, false) AS "isSlowProgress14d",
      COALESCE(sf.is_slow_progress_14d, false) AS "isSlowProgress14Days",
      COALESCE(sf.instructivo_active, false) AS "instructivoActive",
      COALESCE(sf.instructivo_active, false) AS "hasActiveInstructive",
      COALESCE(sf.instructivo_overdue, false) AS "instructivoOverdue",
      COALESCE(sf.instructivo_overdue, false) AS "hasOverdueInstructive",
      s.last_seen_at                         AS "lastSeenAt",
      s.last_lesson_id                       AS "lastLessonId",
      s.status                               AS "status",
      s.updated_at                           AS "updatedAt",
      s.created_at                           AS "createdAt"
    FROM public.students AS s
    LEFT JOIN public.student_flags AS sf ON sf.student_id = s.id
    WHERE s.id = ${studentId}::bigint
    LIMIT 1
  `);

  if (!rows.length) return null;

  return mapRowToStudentBasicDetails(rows[0], studentId);
}

export type StudentBasicDetailsEditablePayload = Partial<
  Pick<StudentBasicDetails, StudentBasicDetailEditableKey>
>;

const LEVEL_CODE_FIELDS = new Set<StudentBasicDetailEditableKey>([
  "currentLevel",
  "plannedLevelMin",
  "plannedLevelMax",
]);

export async function updateStudentBasicDetails(
  studentId: number,
  payload: StudentBasicDetailsEditablePayload,
): Promise<StudentBasicDetails> {
  noStore();
  const sql = getSqlClient();

  const allowedKeys = new Set<StudentBasicDetailEditableKey>(
    EDITABLE_STUDENT_BASIC_DETAIL_KEYS,
  );
  const sanitizedEntries: Array<[StudentBasicDetailEditableKey, unknown]> = [];

  for (const [rawKey, value] of Object.entries(payload)) {
    if (value === undefined) continue;
    const key = rawKey as StudentBasicDetailEditableKey;
    if (!allowedKeys.has(key)) continue;
    sanitizedEntries.push([key, value]);
  }

  if (!sanitizedEntries.length) {
    throw new Error("No se proporcionaron cambios para actualizar.");
  }

  const setFragments = sanitizedEntries.map(([key], index) => {
    const columnName = STUDENT_BASIC_DETAIL_COLUMN_MAP[key];

    if (!columnName) {
      throw new Error(`Campo no permitido: ${key}`);
    }

    const cast = LEVEL_CODE_FIELDS.has(key) ? "::level_code" : "";
    return `${columnName} = $${index + 1}${cast}`;
  });
  setFragments.push("updated_at = NOW()");

  const values = sanitizedEntries.map(([, value]) => (value === undefined ? null : value));
  const query = `
    UPDATE public.students AS s
    SET ${setFragments.join(", ")}
    WHERE s.id = $${values.length + 1}::bigint
    RETURNING
      s.id                                   AS "studentId",
      s.full_name                            AS "fullName",
      s.representative_name                  AS "representativeName",
      s.representative_phone                 AS "representativePhone",
      s.representative_email                 AS "representativeEmail",
      s.has_special_needs                    AS "hasSpecialNeeds",
      s.contract_start                       AS "contractStart",
      s.contract_end                         AS "contractEnd",
      s.frozen_start                         AS "frozenStart",
      s.frozen_end                           AS "frozenEnd",
      s.current_level::text                  AS "currentLevel",
      s.planned_level_min::text              AS "plannedLevelMin",
      s.planned_level_max::text              AS "plannedLevelMax",
      COALESCE(s.is_online, false)           AS "isOnline",
      NULL::boolean                          AS "isNewStudent",
      NULL::boolean                          AS "isExamApproaching",
      NULL::boolean                          AS "isExamPreparation",
      NULL::boolean                          AS "isAbsent7Days",
      NULL::boolean                          AS "isSlowProgress14Days",
      NULL::boolean                          AS "hasActiveInstructive",
      NULL::boolean                          AS "hasOverdueInstructive",
      s.status                               AS "status",
      s.last_seen_at                         AS "lastSeenAt",
      s.last_lesson_id                       AS "lastLessonId",
      s.updated_at                           AS "updatedAt",
      s.created_at                           AS "createdAt"
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
  dueDate: string | null;
  completed: boolean;
  note: string | null;
  updatedAt: string | null;
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
    dueDate: normalizeFieldValue(row.due_date, "date"),
    completed: normalizeFieldValue(row.completed, "boolean") ?? false,
    note: normalizeFieldValue(row.note, "text"),
    updatedAt: normalizeFieldValue(row.updated_at, "datetime"),
    createdAt: normalizeFieldValue(row.created_at, "datetime"),
  };
}

export async function listStudentInstructivos(
  studentId: number,
): Promise<StudentInstructivo[]> {
  noStore();
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT id, student_id, title, due_date, completed, note, updated_at, created_at
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
    dueDate?: string | null;
    completed?: boolean;
    note?: string | null;
  },
): Promise<StudentInstructivo> {
  noStore();
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    INSERT INTO public.student_instructivos (student_id, title, due_date, completed, note)
    VALUES (
      ${studentId}::bigint,
      ${data.title},
      ${data.dueDate ?? null},
      ${data.completed ?? false},
      ${data.note ?? null}
    )
    RETURNING id, student_id, title, due_date, completed, note, updated_at, created_at
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
    dueDate: string | null;
    completed: boolean;
    note: string | null;
  },
): Promise<StudentInstructivo> {
  noStore();
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    UPDATE public.student_instructivos
    SET title = ${data.title},
      due_date = ${data.dueDate},
      completed = ${data.completed},
      note = ${data.note},
      updated_at = NOW()
    WHERE id = ${instructivoId}::bigint
    RETURNING id, student_id, title, due_date, completed, note, updated_at, created_at
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
    RETURNING id, student_id, title, due_date, completed, note, updated_at, created_at
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

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("Database request timed out"));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
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

export type StudentLessonPlanSnapshot = {
  plannedLevelMin: string | null;
  plannedLevelMax: string | null;
  currentLevelCode: string | null;
  currentLessonLabel: string | null;
  currentLessonIndex: number | null;
  lessonsCompleted: number | null;
  lessonsRemaining: number | null;
  lessonsTotal: number | null;
};

export type DailyStudyEntry = {
  date: string;
  hours: number;
  minutes: number | null;
  sessionCount: number | null;
};

export type SessionDurationTargets = {
  shortMinutes: number | null;
  optimalMinutes: number | null;
  longMinutes: number | null;
};

export type StudentCoachPanelSummary = {
  studentId: number;
  fullName: string | null;
  levelCode: string | null;
  lessonSeq: number | null;
  onPace: boolean | null;
  lei30d: number | null;
  leiTrendDelta: number | null;
  leiRatio: number | null;
  hours30d: number | null;
  weeklyActiveDays: number | null;
  avgSessionMinutes30d: number | null;
  lessonsGained30d: number | null;
  lessonsRemaining: number | null;
  forecastMonthsToFinish: number | null;
  targetLph: number | null;
  lastSessionDaysAgo: number | null;
  repeatsAtLast: number | null;
  riskStall: boolean | null;
  riskInactive14d: boolean | null;
  riskAtRisk: boolean | null;
  lessonPlan: StudentLessonPlanSnapshot | null;
  dailyStudy: DailyStudyEntry[];
  sessionDurationTargets: SessionDurationTargets;
};

type JsonRecord = Record<string, unknown> | null | undefined;

function toJsonRecord(value: unknown): JsonRecord {
  if (value == null) {
    return null;
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch (error) {
      console.warn("No se pudo convertir el valor JSON", error);
      return null;
    }
  }

  return null;
}

function extractNumber(source: JsonRecord, keys: string[]): number | null {
  if (!source) {
    return null;
  }
  for (const key of keys) {
    if (key in source) {
      const candidate = source[key];
      const normalized = normalizeNumber(candidate);
      if (normalized != null) {
        return normalized;
      }
    }
  }
  return null;
}

function extractBoolean(source: JsonRecord, keys: string[]): boolean | null {
  if (!source) {
    return null;
  }
  for (const key of keys) {
    if (!(key in source)) continue;
    const candidate = source[key];
    if (typeof candidate === "boolean") {
      return candidate;
    }
    if (typeof candidate === "number") {
      if (!Number.isFinite(candidate)) continue;
      if (candidate === 1) return true;
      if (candidate === 0) return false;
    }
    if (typeof candidate === "string") {
      const normalized = candidate.trim().toLowerCase();
      if (!normalized.length) continue;
      if (["true", "t", "1", "si", "sí"].includes(normalized)) {
        return true;
      }
      if (["false", "f", "0", "no"].includes(normalized)) {
        return false;
      }
    }
  }
  return null;
}

function extractString(source: JsonRecord, keys: string[]): string | null {
  if (!source) {
    return null;
  }
  for (const key of keys) {
    if (!(key in source)) continue;
    const candidate = source[key];
    const normalized = normalizeString(candidate);
    if (normalized != null) {
      return normalized;
    }
  }
  return null;
}

function extractStringFromCollection(
  records: JsonRecord[],
  keys: string[],
): string | null {
  for (const record of records) {
    const value = extractString(record, keys);
    if (value != null) {
      return value;
    }
  }
  return null;
}

function extractNumberFromCollection(
  records: JsonRecord[],
  keys: string[],
): number | null {
  for (const record of records) {
    const value = extractNumber(record, keys);
    if (value != null) {
      return value;
    }
  }
  return null;
}

function sortLessonPlanRecords(records: JsonRecord[]): JsonRecord[] {
  return records
    .slice()
    .sort((a, b) => {
      const indexA = extractNumber(a, [
        "current_lesson_index",
        "lesson_index",
        "lesson_seq",
        "sequence",
        "position",
        "order_index",
      ]);
      const indexB = extractNumber(b, [
        "current_lesson_index",
        "lesson_index",
        "lesson_seq",
        "sequence",
        "position",
        "order_index",
      ]);
      if (indexA != null && indexB != null) {
        return indexA - indexB;
      }
      if (indexA != null) {
        return -1;
      }
      if (indexB != null) {
        return 1;
      }

      const orderA = extractNumber(a, ["lesson_order", "sort_order"]);
      const orderB = extractNumber(b, ["lesson_order", "sort_order"]);
      if (orderA != null && orderB != null) {
        return orderA - orderB;
      }
      if (orderA != null) {
        return -1;
      }
      if (orderB != null) {
        return 1;
      }
      return 0;
    });
}

function countCompletedLessons(records: JsonRecord[]): number {
  let count = 0;

  for (const record of records) {
    const completedFlag = extractBoolean(record, [
      "is_completed",
      "completed",
      "completed_flag",
      "is_done",
    ]);
    if (completedFlag === true) {
      count += 1;
      continue;
    }

    const status = extractString(record, [
      "status",
      "lesson_status",
      "progress_status",
    ]);
    if (status) {
      const normalized = status.toLowerCase();
      if (
        normalized.includes("complet") ||
        normalized.includes("termin") ||
        normalized.includes("aprob") ||
        normalized.includes("finaliz") ||
        normalized.includes("done")
      ) {
        count += 1;
        continue;
      }
    }

    const completedAt = extractString(record, [
      "completed_at",
      "finished_at",
      "approved_at",
      "terminado_en",
    ]);
    if (completedAt) {
      count += 1;
    }
  }

  return count;
}

function findActiveLessonRecord(
  records: JsonRecord[],
  currentLessonIndex: number | null,
): JsonRecord | null {
  for (const record of records) {
    const isCurrent = extractBoolean(record, [
      "is_current",
      "current_flag",
      "is_active",
      "active_flag",
    ]);
    if (isCurrent) {
      return record;
    }
  }

  if (currentLessonIndex != null) {
    for (const record of records) {
      const lessonIndex = extractNumber(record, [
        "current_lesson_index",
        "lesson_index",
        "lesson_seq",
        "sequence",
        "position",
      ]);
      if (lessonIndex != null && Math.trunc(lessonIndex) === currentLessonIndex) {
        return record;
      }
    }
  }

  for (const record of records) {
    const status = extractString(record, [
      "status",
      "lesson_status",
      "progress_status",
    ]);
    if (!status) {
      continue;
    }
    const normalized = status.toLowerCase();
    if (
      normalized.includes("current") ||
      normalized.includes("actual") ||
      normalized.includes("curso") ||
      normalized.includes("en curso") ||
      normalized.includes("activa")
    ) {
      return record;
    }
  }

  return null;
}

function mapLessonPlanSnapshot(
  payload: JsonRecord | JsonRecord[] | null | undefined,
): StudentLessonPlanSnapshot | null {
  if (!payload) {
    return null;
  }

  const records = (Array.isArray(payload) ? payload : [payload]).filter(
    (record): record is JsonRecord => Boolean(record),
  );

  if (!records.length) {
    return null;
  }

  const sortedRecords = sortLessonPlanRecords(records);

  const plannedLevelMin = extractStringFromCollection(sortedRecords, [
    "planned_level_min",
    "planned_min_level",
    "level_min",
    "start_level",
    "level_start",
  ]);
  const plannedLevelMax = extractStringFromCollection(sortedRecords, [
    "planned_level_max",
    "planned_max_level",
    "level_max",
    "target_level",
    "goal_level",
  ]);

  let lessonsTotal = extractNumberFromCollection(sortedRecords, [
    "lessons_total",
    "total_lessons",
    "plan_length",
    "lesson_count",
  ]);
  if (lessonsTotal == null && sortedRecords.length) {
    lessonsTotal = sortedRecords.length;
  }

  let lessonsCompleted = extractNumberFromCollection(sortedRecords, [
    "lessons_completed",
    "completed_lessons",
    "lessons_done",
  ]);
  if (lessonsCompleted == null) {
    const completedCount = countCompletedLessons(sortedRecords);
    if (completedCount > 0 || lessonsTotal != null) {
      lessonsCompleted = completedCount;
    }
  }

  let lessonsRemaining = extractNumberFromCollection(sortedRecords, [
    "lessons_remaining",
    "remaining_lessons",
    "lessons_left",
  ]);
  if (
    lessonsRemaining == null &&
    lessonsTotal != null &&
    lessonsCompleted != null
  ) {
    lessonsRemaining = Math.max(lessonsTotal - lessonsCompleted, 0);
  }

  let currentLessonIndex = extractNumberFromCollection(sortedRecords, [
    "current_lesson_index",
    "current_seq",
    "current_position",
    "lesson_index",
    "lesson_seq",
  ]);
  if (currentLessonIndex == null && lessonsCompleted != null) {
    const tentativeIndex = lessonsCompleted + 1;
    if (lessonsTotal == null || tentativeIndex <= lessonsTotal + 1) {
      currentLessonIndex = tentativeIndex;
    }
  }

  const activeRecord = findActiveLessonRecord(
    sortedRecords,
    currentLessonIndex != null ? Math.trunc(currentLessonIndex) : null,
  );

  const currentLessonLabel =
    extractStringFromCollection(sortedRecords, [
      "current_lesson_label",
      "current_lesson_name",
      "current_lesson",
    ]) ??
    (activeRecord
      ? extractString(activeRecord, [
          "lesson_name",
          "lesson_label",
          "name",
          "title",
        ])
      : null);

  const currentLevelCode =
    extractStringFromCollection(sortedRecords, [
      "current_level_code",
      "current_level",
    ]) ??
    (activeRecord
      ? extractString(activeRecord, [
          "level_code",
          "lesson_level",
          "level",
        ])
      : extractStringFromCollection(sortedRecords, [
          "level_code",
          "lesson_level",
          "level",
        ]));

  if (
    plannedLevelMin == null &&
    plannedLevelMax == null &&
    currentLessonIndex == null &&
    lessonsTotal == null
  ) {
    return null;
  }

  return {
    plannedLevelMin,
    plannedLevelMax,
    currentLevelCode,
    currentLessonLabel,
    currentLessonIndex,
    lessonsCompleted,
    lessonsRemaining,
    lessonsTotal,
  };
}

function mapDailyStudy(payload: JsonRecord): DailyStudyEntry | null {
  if (!payload) {
    return null;
  }

  const date =
    extractString(payload, ["study_date", "session_date", "day", "date"]) ?? "";
  const minutes = extractNumber(payload, [
    "total_minutes",
    "minutes",
    "minutes_total",
  ]);
  const hours =
    extractNumber(payload, ["total_hours", "hours"]) ??
    (minutes != null ? minutes / 60 : null);

  if (!date || hours == null) {
    return null;
  }

  const sessionCount = extractNumber(payload, [
    "session_count",
    "sessions",
    "total_sessions",
  ]);

  return {
    date,
    hours,
    minutes,
    sessionCount,
  };
}

export async function getStudentCoachPanelSummary(
  studentId: number,
): Promise<StudentCoachPanelSummary | null> {
  noStore();
  const sql = getSqlClient();

  const [
    studentRawRows,
    panelRawRows,
    riskRawRows,
    planRawRows,
    dailyRawRows,
    configRawRows,
  ] = await Promise.all([
    withTimeout(
      sql`
        SELECT id AS student_id, full_name
        FROM public.students
        WHERE id = ${studentId}::bigint
        LIMIT 1
      `,
      5000,
    ),
    withTimeout(
      sql`
        SELECT *
        FROM analytics.v_student_coaching_panel_enhanced
        WHERE student_id = ${studentId}::bigint
        LIMIT 1
      `,
      5000,
    ),
    withTimeout(
      sql`
        SELECT *
        FROM analytics.v_at_risk_students
        WHERE student_id = ${studentId}::bigint
        LIMIT 1
      `,
      5000,
    ),
    withTimeout(
      sql`
        SELECT *
        FROM analytics.v_student_lesson_plan
        WHERE student_id = ${studentId}::bigint
      `,
      5000,
    ),
    withTimeout(
      sql`
        SELECT *
        FROM analytics.v_student_daily_minutes_30d
        WHERE student_id = ${studentId}::bigint
      `,
      5000,
    ),
    withTimeout(
      sql`
        SELECT *
        FROM analytics.progress_config
        ORDER BY updated_at DESC NULLS LAST
        LIMIT 1
      `,
      5000,
    ),
  ]);

  const studentRows = normalizeRows<SqlRow>(studentRawRows);
  if (!studentRows.length) {
    return null;
  }

  const panelRows = normalizeRows<SqlRow>(panelRawRows);
  const riskRows = normalizeRows<SqlRow>(riskRawRows);
  const planRows = normalizeRows<SqlRow>(planRawRows);
  const dailyRows = normalizeRows<SqlRow>(dailyRawRows);
  const configRows = normalizeRows<SqlRow>(configRawRows);

  const studentRow = studentRows[0];
  const panelPayload = toJsonRecord(panelRows[0] ?? null);
  const riskPayload = toJsonRecord(riskRows[0] ?? null);
  const configPayload = toJsonRecord(configRows[0] ?? null);
  const planRecords = planRows
    .map((row) => toJsonRecord(row))
    .filter((row): row is JsonRecord => Boolean(row));
  const lessonPlanSnapshot = mapLessonPlanSnapshot(planRecords);

  const studentIdValue =
    normalizeInteger(extractNumber(panelPayload, ["student_id"])) ??
    normalizeInteger(studentRow.student_id) ??
    studentId;

  const minutes30d = extractNumber(panelPayload, [
    "minutes_30d",
    "total_minutes_30d",
  ]);
  const hours30d =
    extractNumber(panelPayload, [
      "hours_30d",
      "total_hours_30d",
      "study_hours_30d",
      "hours_last_30d",
    ]) ??
    (minutes30d != null ? minutes30d / 60 : null);
  const daysActive30d = extractNumber(panelPayload, [
    "days_active_30d",
    "active_days_30d",
  ]);
  const weeklyActiveDays =
    extractNumber(panelPayload, [
      "weekly_active_days",
      "days_active_per_week",
      "avg_active_days_per_week",
      "weekly_days_active",
    ]) ??
    (daysActive30d != null ? daysActive30d / 4.345 : null);

  const leiTrendDelta = extractNumber(panelPayload, [
    "lei_trend_30d",
    "lei_delta_30d",
    "lei_change_30d",
  ]);

  let computedLeiTrend: number | null = leiTrendDelta;
  if (computedLeiTrend == null) {
    const previousLei = extractNumber(panelPayload, [
      "lei_prev_30d",
      "lei_30d_prev",
    ]);
    const currentLei = extractNumber(panelPayload, ["lei_30d"]);
    if (previousLei != null && currentLei != null) {
      computedLeiTrend = currentLei - previousLei;
    }
  }

  const dailyStudyEntries = dailyRows
    .map((row) => mapDailyStudy(toJsonRecord(row)))
    .filter((entry): entry is DailyStudyEntry => Boolean(entry))
    .sort((a, b) => {
      const aTime = Date.parse(a.date);
      const bTime = Date.parse(b.date);
      if (Number.isNaN(aTime) && Number.isNaN(bTime)) {
        return a.date.localeCompare(b.date);
      }
      if (Number.isNaN(aTime)) {
        return -1;
      }
      if (Number.isNaN(bTime)) {
        return 1;
      }
      return aTime - bTime;
    });

  return {
    studentId: studentIdValue,
    fullName:
      normalizeString(panelPayload?.full_name) ??
      normalizeString(studentRow.full_name),
    levelCode:
      extractString(panelPayload, ["level_code", "current_level_code"]) ??
      lessonPlanSnapshot?.currentLevelCode ??
      null,
    lessonSeq:
      extractNumber(panelPayload, [
        "lesson_seq",
        "current_lesson_seq",
        "current_lesson_index",
      ]) ?? lessonPlanSnapshot?.currentLessonIndex ?? null,
    onPace: extractBoolean(panelPayload, ["on_pace"]),
    lei30d: extractNumber(panelPayload, ["lei_30d"]),
    leiTrendDelta: computedLeiTrend,
    leiRatio: extractNumber(panelPayload, ["lei_ratio"]),
    hours30d,
    weeklyActiveDays,
    avgSessionMinutes30d: extractNumber(panelPayload, [
      "avg_session_minutes_30d",
      "average_session_minutes_30d",
    ]),
    lessonsGained30d: extractNumber(panelPayload, [
      "lessons_gained_30d",
      "lessons_progress_30d",
      "lessons_last_30d",
    ]),
    lessonsRemaining:
      extractNumber(panelPayload, ["lessons_remaining"]) ??
      lessonPlanSnapshot?.lessonsRemaining ??
      null,
    forecastMonthsToFinish: extractNumber(panelPayload, [
      "forecast_months_to_finish",
      "months_to_finish",
    ]),
    targetLph:
      extractNumber(panelPayload, ["target_lph", "target_lei", "lei_target"]) ??
      extractNumber(configPayload, ["target_lph", "target_lei"]),
    lastSessionDaysAgo: extractNumber(panelPayload, [
      "days_since_last",
      "days_since_last_session",
      "days_last_seen",
      "days_since_last_activity",
    ]),
    repeatsAtLast: extractNumber(panelPayload, [
      "repeats_at_last",
      "repeat_count_last",
    ]),
    riskStall:
      extractBoolean(riskPayload, [
        "stall_flag",
        "is_stalled",
        "stalling",
        "stalling_flag",
      ]) ??
      extractBoolean(panelPayload, [
        "stall_flag",
        "is_stalled",
        "stalling",
        "stalling_flag",
      ]),
    riskInactive14d: extractBoolean(riskPayload, [
      "inactive_14d",
      "inactive_14_days",
      "inactive_flag",
    ]) ?? extractBoolean(panelPayload, [
      "inactive_14d",
      "inactive_14_days",
      "inactive_flag",
    ]),
    riskAtRisk:
      extractBoolean(riskPayload, ["at_risk", "is_at_risk"]) ??
      extractBoolean(panelPayload, ["at_risk", "is_at_risk"]),
    lessonPlan: lessonPlanSnapshot,
    dailyStudy: dailyStudyEntries,
    sessionDurationTargets: {
      shortMinutes: extractNumber(configPayload, [
        "short_session_minutes",
        "short_session_threshold",
      ]),
      optimalMinutes: extractNumber(configPayload, [
        "target_session_minutes",
        "optimal_session_minutes",
      ]),
      longMinutes: extractNumber(configPayload, [
        "long_session_minutes",
        "long_session_threshold",
      ]),
    },
  };
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
