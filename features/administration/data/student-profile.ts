import { unstable_noStore as noStore } from "next/cache";

import { getSqlClient, normalizeRows, SqlRow } from "@/lib/db/client";
import {
  isMissingStudentFlagRelation,
  STUDENT_FLAG_RELATION_CANDIDATES,
} from "./student-flag-relations";

export type BasicDetailFieldType =
  | "text"
  | "textarea"
  | "date"
  | "number"
  | "boolean"
  | "datetime";

export interface Student {
  id: number;
  full_name: string;
  representative_name?: string | null;
  representative_phone?: string | null;
  representative_email?: string | null;
  contract_start?: string | null;
  contract_end?: string | null;
  graduation_date?: string | null;
  frozen_start?: string | null;
  frozen_end?: string | null;
  planned_level_min?: string | null;
  planned_level_max?: string | null;
  special_needs?: boolean | null;
  is_online?: boolean | null;
  archived?: boolean | null;
  status:
    | "invalid"
    | "graduated"
    | "contract_terminated"
    | "frozen"
    | "online"
    | "active";
}

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
  graduationDate: string | null;
  frozenStart: string | null;
  frozenEnd: string | null;
  currentLevel: string | null;
  plannedLevelMin: string | null;
  plannedLevelMax: string | null;
  hasSpecialNeeds: boolean | null;
  isOnline: boolean | null;
  isNewStudent: boolean | null;
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
  archived: boolean | null;
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
    editable: false,
  },
  {
    key: "frozenStart",
    dbColumn: "frozenStart",
    label: "Inicio de congelamiento",
    type: "date",
    editable: false,
  },
  {
    key: "frozenEnd",
    dbColumn: "frozenEnd",
    label: "Fin de congelamiento",
    type: "date",
    editable: false,
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
  plannedLevelMin: "planned_level_min",
  plannedLevelMax: "planned_level_max",
  isOnline: "is_online",
} as const;

type StudentBasicDetailColumnKey = keyof typeof STUDENT_BASIC_DETAIL_COLUMN_MAP;

type StudentBasicDetailEditableKey = Extract<
  StudentBasicDetailColumnKey,
  | "fullName"
  | "representativeName"
  | "representativePhone"
  | "representativeEmail"
  | "hasSpecialNeeds"
  | "isOnline"
  | "contractStart"
  | "plannedLevelMin"
  | "plannedLevelMax"
>;

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
    graduationDate: normalizeFieldValue(row.graduationDate, "date"),
    frozenStart: normalizeFieldValue(row.frozenStart, "date"),
    frozenEnd: normalizeFieldValue(row.frozenEnd, "date"),
    currentLevel: normalizeFieldValue(row.currentLevel, "text"),
    plannedLevelMin: normalizeFieldValue(row.plannedLevelMin, "text"),
    plannedLevelMax: normalizeFieldValue(row.plannedLevelMax, "text"),
    hasSpecialNeeds: normalizeFieldValue(row.hasSpecialNeeds, "boolean"),
    isOnline: normalizeFieldValue(row.isOnline, "boolean"),
    isNewStudent: normalizeFieldValue(row.isNewStudent, "boolean"),
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
    archived: normalizeFieldValue(row.archived, "boolean"),
  };
}

export async function getStudentBasicDetails(studentId: number): Promise<StudentBasicDetails | null> {
  noStore();
  const sql = getSqlClient();

  const rows = await fetchStudentBasicDetailsRows(sql, studentId);

  if (!rows.length) return null;

  return mapRowToStudentBasicDetails(rows[0], studentId);
}

export type StudentBasicDetailsEditablePayload = Partial<
  Pick<StudentBasicDetails, StudentBasicDetailEditableKey>
>;

const LEVEL_CODE_FIELDS = new Set<StudentBasicDetailEditableKey>([
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
      s.graduation_date                     AS "graduationDate",
      s.frozen_start                         AS "frozenStart",
      s.frozen_end                           AS "frozenEnd",
      s.current_level::text                  AS "currentLevel",
      s.planned_level_min::text              AS "plannedLevelMin",
      s.planned_level_max::text              AS "plannedLevelMax",
      COALESCE(s.is_online, false)           AS "isOnline",
      COALESCE(s.archived, false)            AS "archived",
      NULL::boolean                          AS "isNewStudent",
      NULL::boolean                          AS "isExamPreparation",
      NULL::boolean                          AS "isAbsent7Days",
      NULL::boolean                          AS "isSlowProgress14Days",
      NULL::boolean                          AS "hasActiveInstructive",
      NULL::boolean                          AS "hasOverdueInstructive",
      s.status                               AS "status"
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

function parseDateTime(value: unknown): Date | null {
  if (value == null) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string") {
    let candidate = value.trim();
    if (!candidate) {
      return null;
    }
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(candidate)) {
      candidate = candidate.replace(" ", "T");
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(candidate)) {
      candidate = `${candidate}:00`;
    }
    if (/([+-]\d{2})(\d{2})$/.test(candidate)) {
      candidate = candidate.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(candidate) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(candidate)) {
      candidate = `${candidate}-05:00`;
    }
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

function formatGuayaquilDay(date: Date): string {
  return GUAYAQUIL_DAY_FORMATTER.format(date);
}

function toIsoString(date: Date): string {
  return date.toISOString();
}

function buildRecentDayKeys(days: number): string[] {
  const normalizedDays = Number.isFinite(days) ? Math.max(1, Math.trunc(days)) : 30;
  const keys: string[] = [];
  const reference = new Date();
  for (let index = normalizedDays - 1; index >= 0; index -= 1) {
    const cursor = new Date(reference);
    cursor.setDate(reference.getDate() - index);
    keys.push(formatGuayaquilDay(cursor));
  }
  return keys;
}

function normalizeIsoDay(value: unknown): string | null {
  const stringValue = normalizeString(value);
  if (stringValue && /^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
    return stringValue;
  }
  const parsed = parseDateTime(value);
  return parsed ? formatGuayaquilDay(parsed) : null;
}

function compareIsoDays(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

function parseIsoDayToDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatIsoDayFromDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addIsoDays(day: string, offset: number): string | null {
  const base = parseIsoDayToDate(day);
  if (!base || !Number.isFinite(offset)) {
    return null;
  }
  base.setUTCDate(base.getUTCDate() + Math.trunc(offset));
  return formatIsoDayFromDate(base);
}

function diffIsoDays(start: string, end: string): number {
  const startDate = parseIsoDayToDate(start);
  const endDate = parseIsoDayToDate(end);
  if (!startDate || !endDate) {
    return 0;
  }
  const diff = (endDate.getTime() - startDate.getTime()) / 86400000;
  return diff > 0 ? Math.round(diff) : 0;
}

function normalizeLessonLevel(value: unknown): string | null {
  const stringValue = normalizeString(value);
  return stringValue ? stringValue.trim().toUpperCase() : null;
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

async function safeQuery(
  promise: Promise<unknown>,
  label: string,
): Promise<SqlRow[]> {
  try {
    const result = await withTimeout(promise, 5000);
    return normalizeRows<SqlRow>(result);
  } catch (error) {
    console.error(`Fallo al consultar ${label} para el panel del coach`, error);
    return [];
  }
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

export type StudentAttendanceHistoryEntry = {
  id: number;
  checkInTime: string;
  checkOutTime: string | null;
  lessonLabel: string | null;
  levelCode: string | null;
  lessonSequence: number | null;
  durationMinutes: number | null;
};

export type CoachPanelProfileHeader = {
  studentId: number;
  fullName: string | null;
  profileImageUrl: string | null;
  planLevelMin: string | null;
  planLevelMax: string | null;
  planProgressPct: number | null;
  completedLessonsInPlan: number | null;
  totalLessonsInPlan: number | null;
  currentLevel: string | null;
  currentLevelProgressPct: number | null;
  lastSeenDate: string | null;
  inactive14d: boolean;
  stall: boolean;
  onPacePlan: boolean;
  forecastMonthsToFinishPlan: number | null;
};

export type CoachPanelLessonJourneyEntry = {
  lessonId: number | null;
  lessonGlobalSeq: number | null;
  level: string | null;
  seq: number | null;
  lessonName: string | null;
  hoursSpent: number | null;
  calendarDaysSpent: number | null;
  isIntroBooklet: boolean;
  isExam: boolean;
  isCurrentLesson: boolean;
  isCompletedVisual: boolean;
};

export type CoachPanelLessonJourney = {
  lessons: CoachPanelLessonJourneyEntry[];
  plannedLevelMin: string | null;
  plannedLevelMax: string | null;
};

export type LessonEffortRow = {
  lessonId: number | null;
  level: string | null;
  seq: number | null;
  totalHours: number | null;
  calendarDaysBetween: number | null;
  sessionsCount: number | null;
  activeDaysForLesson: number | null;
  startedOn: string | null;
  finishedOn: string | null;
  isCompletedByPosition: boolean | null;
};

export type CoachPanelEngagementHeatmapEntry = {
  date: string;
  minutes: number;
};

export type CoachPanelLeiTrendEntry = {
  date: string;
  lessonsGained: number;
  cumulativeLessons: number;
  minutesStudied: number;
  leiValue: number;
};

export type CoachPanelEngagement = {
  stats: {
    daysActive30d: number | null;
    totalMinutes30d: number | null;
    totalHours30d: number | null;
    avgSessionMinutes30d: number | null;
  };
  heatmap: CoachPanelEngagementHeatmapEntry[];
  lei: {
    lei30dPlan: number | null;
    trend: CoachPanelLeiTrendEntry[];
  };
};

export type LearnerSpeedSummary = {
  label: "Slow" | "Normal" | "Fast" | null;
  lei30dPlan: number | null;
};

export type StudentLeiRank = {
  position: number | null;
  topPercent: number | null;
  cohortSize: number | null;
};

export type DaypartRow = {
  daypart: "Morning" | "Afternoon" | "Evening" | "Night";
  minutes: number;
};

export type HourlyHistogramRow = {
  hourOfDay: number;
  minutes: number;
  sessions: number;
};

export type StudyActivity30dSummary = {
  totalMinutes: number | null;
  activeDays: number | null;
  activeSessions: number | null;
};

export type CoachPanelPaceForecast = {
  forecastMonthsToFinishPlan: number | null;
  lessonsRemaining: number | null;
  totalLessonsInPlan: number | null;
  onPacePlan: boolean | null;
  planProgressPct: number | null;
};

export type CoachPanelRecentActivityEntry = {
  attendanceId: number;
  sessionMinutes: number | null;
  checkIn: string;
  checkOut: string | null;
  level: string | null;
  seq: number | null;
  lessonGlobalSeq: number | null;
};

export type CoachPanelLessonSessionEntry = {
  attendanceId: number;
  sessionMinutes: number | null;
  checkIn: string;
  checkOut: string | null;
};

type CoachPanelSessionSnapshot = {
  attendanceId: number;
  lessonId: number | null;
  checkInIso: string;
  checkOutIso: string | null;
  localDay: string | null;
  sessionMinutes: number;
  level: string | null;
  seq: number | null;
  lessonGlobalSeq: number | null;
};

export type StudentCoachPanelSummary = {
  profileHeader: CoachPanelProfileHeader;
  lessonJourney: CoachPanelLessonJourney;
  engagement: CoachPanelEngagement;
  paceForecast: CoachPanelPaceForecast;
  recentActivity: CoachPanelRecentActivityEntry[];
  learnerSpeed: LearnerSpeedSummary;
  leiRank: StudentLeiRank;
  studyHistogram: {
    hourly: HourlyHistogramRow[];
    summary: StudyActivity30dSummary;
  };
};

type CoachPanelOverview = {
  header: CoachPanelProfileHeader;
  engagementStats: CoachPanelEngagement["stats"];
  lei30dPlan: number | null;
  lessonsRemaining: number | null;
  totalLessonsInPlan: number | null;
  planProgressPct: number | null;
};

type JsonRecord = Record<string, unknown> | null | undefined;

const GUAYAQUIL_TIMEZONE = "America/Guayaquil";

const GUAYAQUIL_DAY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: GUAYAQUIL_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

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

function toPercentValue(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  const normalized = Math.abs(value) <= 1 ? value * 100 : value;
  if (!Number.isFinite(normalized)) {
    return null;
  }
  return Math.min(100, Math.max(0, normalized));
}

function coerceBoolean(value: boolean | null | undefined): boolean {
  return value === true;
}

function computeCompletedLessons(
  completedLessons: number | null,
  totalLessons: number | null,
  planProgressPct: number | null,
): number | null {
  if (completedLessons != null && Number.isFinite(completedLessons)) {
    return completedLessons;
  }
  if (
    planProgressPct != null &&
    Number.isFinite(planProgressPct) &&
    totalLessons != null &&
    Number.isFinite(totalLessons)
  ) {
    return Math.round((planProgressPct / 100) * totalLessons);
  }
  return null;
}

export async function getStudentCoachPanelProfileHeader(
  studentId: number,
): Promise<CoachPanelOverview | null> {
  noStore();
  const sql = getSqlClient();
  const rows = await safeQuery(
    sql`
      SELECT *
      FROM mart.coach_panel_v
      WHERE student_id = ${studentId}::bigint
      LIMIT 1
    `,
    "mart.coach_panel_v",
  );

  if (!rows.length) {
    return null;
  }

  const payload = toJsonRecord(rows[0]);
  if (!payload) {
    return null;
  }

  const studentIdValue =
    normalizeInteger(extractNumber(payload, ["student_id"])) ?? studentId;

  const planProgressPct = toPercentValue(
    extractNumber(payload, ["progress_pct_plan", "plan_progress_pct"]),
  );
  const totalLessonsInPlan = extractNumber(payload, [
    "total_lessons_in_plan",
    "lessons_in_plan",
    "plan_total_lessons",
  ]);
  const completedLessonsRaw = extractNumber(payload, [
    "completed_lessons_in_plan",
    "lessons_completed_in_plan",
  ]);
  const completedLessons = computeCompletedLessons(
    completedLessonsRaw,
    totalLessonsInPlan,
    planProgressPct,
  );
  const lessonsRemainingRaw = extractNumber(payload, [
    "lessons_remaining_in_plan",
    "lessons_remaining",
  ]);
  const lessonsRemaining =
    lessonsRemainingRaw != null
      ? lessonsRemainingRaw
      : totalLessonsInPlan != null && completedLessons != null
        ? Math.max(0, totalLessonsInPlan - completedLessons)
        : null;

  const totalMinutes30d = extractNumber(payload, [
    "total_minutes_30d",
    "minutes_30d",
  ]);
  const totalHours30d =
    extractNumber(payload, ["total_hours_30d", "hours_30d"]) ??
    (totalMinutes30d != null ? totalMinutes30d / 60 : null);

  const header: CoachPanelProfileHeader = {
    studentId: studentIdValue,
    fullName: extractString(payload, ["full_name", "student_name"]),
    profileImageUrl: extractString(payload, [
      "profile_image_url",
      "photo_url",
      "image_url",
    ]),
    planLevelMin: extractString(payload, [
      "level_min",
      "plan_level_min",
      "journey_min_level",
    ]),
    planLevelMax: extractString(payload, [
      "level_max",
      "plan_level_max",
      "journey_max_level",
    ]),
    planProgressPct,
    completedLessonsInPlan: completedLessons,
    totalLessonsInPlan,
    currentLevel: extractString(payload, [
      "level",
      "current_level",
      "level_code",
    ]),
    currentLevelProgressPct: toPercentValue(
      extractNumber(payload, ["progress_pct_level", "level_progress_pct"]),
    ),
    lastSeenDate: extractString(payload, [
      "last_seen_date",
      "last_activity_date",
      "last_session_date",
    ]),
    inactive14d: coerceBoolean(
      extractBoolean(payload, ["inactive_14d", "inactive_14_days"]),
    ),
    stall: coerceBoolean(
      extractBoolean(payload, ["stall", "stall_flag", "is_stalled"]),
    ),
    onPacePlan: coerceBoolean(
      extractBoolean(payload, ["on_pace_plan", "on_pace"]),
    ),
    forecastMonthsToFinishPlan: extractNumber(payload, [
      "forecast_months_to_finish_plan",
      "forecast_months_to_finish",
    ]),
  };

  const engagementStats: CoachPanelEngagement["stats"] = {
    daysActive30d: extractNumber(payload, ["days_active_30d", "active_days_30d"]),
    totalMinutes30d,
    totalHours30d,
    avgSessionMinutes30d: extractNumber(payload, [
      "avg_session_minutes_30d",
      "average_session_minutes_30d",
    ]),
  };

  return {
    header,
    engagementStats,
    lei30dPlan: extractNumber(payload, [
      "lei_30d_plan",
      "lei_plan_30d",
      "lei30d_plan",
    ]),
    lessonsRemaining,
    totalLessonsInPlan: totalLessonsInPlan ?? header.totalLessonsInPlan ?? null,
    planProgressPct: planProgressPct ?? header.planProgressPct ?? null,
  };
}

export type StudentLessonRecorrido = {
  plannedLevelMin: string | null;
  plannedLevelMax: string | null;
  lessons: CoachPanelLessonJourneyEntry[];
};

export async function getStudentLessonRecorrido(
  studentId: number,
): Promise<StudentLessonRecorrido> {
  noStore();
  const sql = getSqlClient();

  const [lessonRows, planRows] = await Promise.all([
    safeQuery(
      sql`
        SELECT
          lesson_id,
          level,
          seq,
          lesson_name,
          hours_spent,
          calendar_days_spent,
          is_intro_booklet,
          is_exam,
          is_current_lesson,
          is_completed_visual
        FROM mart.student_recorrido_v
        WHERE student_id = ${studentId}::bigint
        ORDER BY level, seq
      `,
      "mart.student_recorrido_v",
    ),
    safeQuery(
      sql`
        SELECT planned_level_min, planned_level_max
        FROM public.students
        WHERE id = ${studentId}::bigint
        LIMIT 1
      `,
      "public.students",
    ),
  ]);

  const planRecord = planRows.length ? toJsonRecord(planRows[0]) : null;
  const plannedLevelMin = extractString(planRecord, [
    "planned_level_min",
    "plan_level_min",
    "nivel_planificado_min",
  ]);
  const plannedLevelMax = extractString(planRecord, [
    "planned_level_max",
    "plan_level_max",
    "nivel_planificado_max",
  ]);

  const lessons = lessonRows
    .map((row): CoachPanelLessonJourneyEntry | null => {
      const payload = toJsonRecord(row);
      if (!payload) {
        return null;
      }

      return {
        lessonId: normalizeInteger(payload.lesson_id),
        lessonGlobalSeq: null,
        level: extractString(payload, ["level", "level_code"]),
        seq: extractNumber(payload, ["seq", "lesson_seq", "lesson_number"]),
        lessonName: extractString(payload, ["lesson_name", "lesson", "lesson_label"]),
        hoursSpent: extractNumber(payload, ["hours_spent", "total_hours"]),
        calendarDaysSpent: extractNumber(payload, [
          "calendar_days_spent",
          "active_days_for_lesson",
          "calendar_days",
        ]),
        isIntroBooklet: coerceBoolean(
          extractBoolean(payload, ["is_intro_booklet", "intro_booklet"]),
        ),
        isExam: coerceBoolean(extractBoolean(payload, ["is_exam", "exam"])),
        isCurrentLesson: coerceBoolean(
          extractBoolean(payload, ["is_current_lesson", "current_lesson"]),
        ),
        isCompletedVisual: coerceBoolean(
          extractBoolean(payload, ["is_completed_visual", "completed_visual"]),
        ),
      } satisfies CoachPanelLessonJourneyEntry;
    })
    .filter((lesson): lesson is CoachPanelLessonJourneyEntry => Boolean(lesson));

  return {
    plannedLevelMin: plannedLevelMin ?? null,
    plannedLevelMax: plannedLevelMax ?? null,
    lessons,
  };
}

export async function listStudentCoachPlanLessons(
  studentId: number,
): Promise<CoachPanelLessonJourneyEntry[]> {
  const recorrido = await getStudentLessonRecorrido(studentId);
  return recorrido.lessons;
}

export async function listStudentPlanLessonEffort(
  studentId: number,
): Promise<LessonEffortRow[]> {
  noStore();
  const sql = getSqlClient();

  const rows = await safeQuery(
    sql`
      SELECT
        level,
        seq,
        lesson_id,
        total_hours,
        calendar_days_between,
        sessions_count,
        active_days_for_lesson,
        started_on,
        finished_on,
        is_completed_by_position
      FROM mart.student_plan_lesson_effort_v
      WHERE student_id = ${studentId}::bigint
      ORDER BY level, seq
    `,
    "mart.student_plan_lesson_effort_v",
  );

  const entries = rows
    .map((row): LessonEffortRow | null => {
      const payload = toJsonRecord(row);
      if (!payload) {
        return null;
      }

      return {
        lessonId: normalizeInteger(payload.lesson_id),
        level: extractString(payload, ["level", "level_code"]),
        seq: extractNumber(payload, ["seq", "lesson_seq", "lesson_number"]),
        totalHours: extractNumber(payload, ["total_hours", "hours", "study_hours"]),
        calendarDaysBetween: extractNumber(payload, [
          "calendar_days_between",
          "calendar_days",
        ]),
        sessionsCount: extractNumber(payload, ["sessions_count", "session_count"]),
        activeDaysForLesson: extractNumber(payload, [
          "active_days_for_lesson",
          "active_days",
        ]),
        startedOn: extractString(payload, ["started_on", "first_started_on", "first_activity_on"]),
        finishedOn: extractString(payload, ["finished_on", "last_finished_on", "last_activity_on"]),
        isCompletedByPosition: extractBoolean(payload, [
          "is_completed_by_position",
          "completed_by_position",
        ]),
      } satisfies LessonEffortRow;
    })
    .filter((entry): entry is LessonEffortRow => Boolean(entry));

  return entries;
}

export async function getStudentCoachPlanPosition(
  studentId: number,
): Promise<number | null> {
  noStore();
  const sql = getSqlClient();
  const rows = await safeQuery(
    sql`
      SELECT current_global_seq_in_plan
      FROM mart.student_plan_progress_v
      WHERE student_id = ${studentId}::bigint
      LIMIT 1
    `,
    "mart.student_plan_progress_v",
  );

  if (!rows.length) {
    return null;
  }

  const payload = toJsonRecord(rows[0]);
  const value = extractNumber(payload, ["current_global_seq_in_plan"]);
  return value != null && Number.isFinite(value) ? value : null;
}

export async function listStudentEngagementHeatmap(
  studentId: number,
  days = 30,
): Promise<CoachPanelEngagementHeatmapEntry[]> {
  noStore();
  const normalizedDays = Number.isFinite(days) ? Math.max(1, Math.trunc(days)) : 30;
  const sql = getSqlClient();
  const dayKeys = buildRecentDayKeys(normalizedDays);
  const daySet = new Set(dayKeys);

  const rows = await safeQuery(
    sql`
      SELECT d, minutes
      FROM mart.student_heatmap_30d_v
      WHERE student_id = ${studentId}::bigint
      ORDER BY d
    `,
    "mart.student_heatmap_30d_v",
  );

  const minutesByDay = new Map<string, number>();
  rows.forEach((row) => {
    const payload = toJsonRecord(row);
    if (!payload) {
      return;
    }
    const day = normalizeIsoDay(payload.d ?? payload.date ?? null);
    if (!day || !daySet.has(day)) {
      return;
    }
    const minutes = extractNumber(payload, ["minutes", "session_minutes"]);
    if (minutes == null || !Number.isFinite(minutes)) {
      return;
    }
    minutesByDay.set(day, (minutesByDay.get(day) ?? 0) + minutes);
  });

  return dayKeys.map((date) => ({
    date,
    minutes: Math.max(0, Math.round(minutesByDay.get(date) ?? 0)),
  }));
}

export async function listStudentLeiTrend(
  studentId: number,
  days?: number | null,
): Promise<CoachPanelLeiTrendEntry[]> {
  noStore();
  const sessions = await fetchCoachPanelSessions(studentId, 1800);

  if (!sessions.length) {
    return [];
  }

  const aggregates = new Map<
    string,
    { maxSeq: number | null; minutes: number }
  >();

  sessions
    .slice()
    .sort((a, b) => a.checkInIso.localeCompare(b.checkInIso))
    .forEach((session) => {
      const day = session.localDay ?? session.checkInIso.slice(0, 10);
      if (!day) {
        return;
      }
      const entry = aggregates.get(day) ?? { maxSeq: null, minutes: 0 };
      if (session.lessonGlobalSeq != null && Number.isFinite(session.lessonGlobalSeq)) {
        const normalizedSeq = Math.max(0, Math.trunc(session.lessonGlobalSeq));
        entry.maxSeq = entry.maxSeq == null ? normalizedSeq : Math.max(entry.maxSeq, normalizedSeq);
      }
      if (session.sessionMinutes != null && Number.isFinite(session.sessionMinutes)) {
        entry.minutes += Math.max(0, session.sessionMinutes);
      }
      aggregates.set(day, entry);
    });

  const sortedDays = Array.from(aggregates.keys()).sort(compareIsoDays);
  const entries: CoachPanelLeiTrendEntry[] = [];

  let previousDay: string | null = null;
  let previousMax: number | null = null;

  sortedDays.forEach((day) => {
    if (previousDay) {
      const gap = diffIsoDays(previousDay, day);
      for (let offset = 1; offset < gap; offset += 1) {
        const fillerDay = addIsoDays(previousDay, offset);
        if (!fillerDay) {
          continue;
        }
        entries.push({
          date: fillerDay,
          lessonsGained: 0,
          cumulativeLessons: previousMax ?? 0,
          minutesStudied: 0,
          leiValue: 0,
        });
      }
    }

    const metrics = aggregates.get(day);
    const normalizedMax = metrics?.maxSeq != null && Number.isFinite(metrics.maxSeq)
      ? Math.max(0, Math.trunc(metrics.maxSeq))
      : previousMax ?? 0;
    const minutes = metrics?.minutes ?? 0;
    const gained = previousMax == null ? normalizedMax : Math.max(0, normalizedMax - previousMax);
    const hours = minutes / 60;
    const leiValue = hours > 0 ? gained / hours : 0;
    const cumulativeLessons = previousMax == null ? normalizedMax : Math.max(previousMax, normalizedMax);

    entries.push({
      date: day,
      lessonsGained: Math.max(0, gained),
      cumulativeLessons,
      minutesStudied: Math.max(0, Math.round(minutes)),
      leiValue: Number.isFinite(leiValue) ? leiValue : 0,
    });

    previousDay = day;
    previousMax = cumulativeLessons;
  });

  if (days != null && Number.isFinite(days) && days > 0) {
    const limit = Math.max(1, Math.trunc(days));
    return entries.slice(-limit);
  }

  return entries;
}

export async function listStudentRecentSessions(
  studentId: number,
  limit = 10,
): Promise<CoachPanelRecentActivityEntry[]> {
  noStore();
  const sessions = await fetchCoachPanelSessions(studentId, Math.max(limit * 6, 120));
  return buildRecentActivityFromSessions(sessions, limit);
}

const LEARNER_SPEED_LABEL_MAP: Record<string, LearnerSpeedSummary["label"]> = {
  slow: "Slow",
  lento: "Slow",
  normal: "Normal",
  fast: "Fast",
  rapido: "Fast",
  rápido: "Fast",
};
 
export async function getStudentLearnerSpeedSummary(
  studentId: number,
): Promise<LearnerSpeedSummary> {
  noStore();
  const sql = getSqlClient();

  const rows = await safeQuery(
    sql`
      SELECT learner_speed_label, lei_30d_plan
      FROM mart.student_learner_speed_v
      WHERE student_id = ${studentId}::bigint
      LIMIT 1
    `,
    "mart.student_learner_speed_v",
  );

  const defaults: LearnerSpeedSummary = {
    label: null,
    lei30dPlan: null,
  };

  if (!rows.length) {
    return defaults;
  }

  const payload = toJsonRecord(rows[0]);
  if (!payload) {
    return defaults;
  }

  const rawLabel = extractString(payload, ["learner_speed_label"]);
  const normalizedLabel = rawLabel
    ? LEARNER_SPEED_LABEL_MAP[rawLabel.trim().toLowerCase()] ?? null
    : null;

  const leiPlan = extractNumber(payload, ["lei_30d_plan", "mean_lei"]);

  return {
    label: normalizedLabel,
    lei30dPlan: leiPlan != null && Number.isFinite(leiPlan) ? leiPlan : null,
  };
}

export async function getStudentLeiRank(studentId: number): Promise<StudentLeiRank> {
  noStore();
  const sql = getSqlClient();

  const rows = await safeQuery(
    sql`
      SELECT position, top_percent, cohort_n
      FROM mart.student_lei_rank_30d_v
      WHERE student_id = ${studentId}::bigint
      LIMIT 1
    `,
    "mart.student_lei_rank_30d_v",
  );

  const defaults: StudentLeiRank = {
    position: null,
    topPercent: null,
    cohortSize: null,
  };

  if (!rows.length) {
    return defaults;
  }

  const payload = toJsonRecord(rows[0]);
  if (!payload) {
    return defaults;
  }

  const position = extractNumber(payload, ["position", "rank_position"]);
  const topPercent = extractNumber(payload, ["top_percent", "top_pct"]);
  const cohortSize = extractNumber(payload, ["cohort_n", "cohort_size"]);

  return {
    position: position != null && Number.isFinite(position) ? Math.max(1, Math.trunc(position)) : null,
    topPercent:
      topPercent != null && Number.isFinite(topPercent) ? Math.max(0, Math.min(100, topPercent)) : null,
    cohortSize:
      cohortSize != null && Number.isFinite(cohortSize) ? Math.max(0, Math.trunc(cohortSize)) : null,
  };
}

const DAYPART_LABELS: ReadonlyArray<DaypartRow["daypart"]> = [
  "Morning",
  "Afternoon",
  "Evening",
  "Night",
];

const DAYPART_ALIAS: Record<string, DaypartRow["daypart"]> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
  madrugada: "Morning",
  manana: "Morning",
  "mañana": "Morning",
  tarde: "Afternoon",
  noche: "Night",
};

export async function listStudentDaypart30d(studentId: number): Promise<DaypartRow[]> {
  noStore();
  const sql = getSqlClient();

  const rows = await safeQuery(
    sql`
      SELECT daypart, minutes
      FROM mart.student_daypart_30d_v
      WHERE student_id = ${studentId}::bigint
    `,
    "mart.student_daypart_30d_v",
  );

  const minutesByDaypart = new Map<DaypartRow["daypart"], number>();

  rows.forEach((row) => {
    const payload = toJsonRecord(row);
    if (!payload) {
      return;
    }

    const rawDaypart = extractString(payload, ["daypart"]);
    if (!rawDaypart) {
      return;
    }

    const normalizedKey = rawDaypart.trim().toLowerCase();
    const resolvedDaypart =
      (DAYPART_LABELS as ReadonlyArray<string>).includes(rawDaypart as string)
        ? (rawDaypart as DaypartRow["daypart"])
        : DAYPART_ALIAS[normalizedKey];

    if (!resolvedDaypart) {
      return;
    }

    const minutes = extractNumber(payload, ["minutes", "total_minutes", "minutes_total"]);
    const safeMinutes = minutes != null && Number.isFinite(minutes) ? Math.max(0, Math.round(minutes)) : 0;
    minutesByDaypart.set(resolvedDaypart, safeMinutes);
  });

  return DAYPART_LABELS.map((daypart) => ({
    daypart,
    minutes: minutesByDaypart.get(daypart) ?? 0,
  }));
}

export async function listStudentHourlyStudy30d(
  studentId: number,
): Promise<HourlyHistogramRow[]> {
  noStore();
  const sql = getSqlClient();

  const rows = await safeQuery(
    sql`
      SELECT hour_of_day, sessions, minutes
      FROM mart.student_hourly_30d_v
      WHERE student_id = ${studentId}::bigint
      ORDER BY hour_of_day
    `,
    "mart.student_hourly_30d_v",
  );

  const histogram: HourlyHistogramRow[] = [];

  rows.forEach((row) => {
    const payload = toJsonRecord(row);
    if (!payload) {
      return;
    }

    const hour = extractNumber(payload, ["hour_of_day", "hour"]);
    if (hour == null || !Number.isFinite(hour)) {
      return;
    }

    const normalizedHour = Math.min(23, Math.max(0, Math.trunc(hour)));
    const minutes = extractNumber(payload, ["minutes", "minutes_total", "total_minutes"]);
    const sessions = extractNumber(payload, ["sessions", "session_count"]);

    histogram.push({
      hourOfDay: normalizedHour,
      minutes:
        minutes != null && Number.isFinite(minutes) ? Math.max(0, Math.round(minutes)) : 0,
      sessions:
        sessions != null && Number.isFinite(sessions) ? Math.max(0, Math.round(sessions)) : 0,
    });
  });

  histogram.sort((a, b) => a.hourOfDay - b.hourOfDay);
  return histogram;
}

export async function getStudentActivity30dSummary(
  studentId: number,
): Promise<StudyActivity30dSummary> {
  noStore();
  const sql = getSqlClient();

  const rows = await safeQuery(
    sql`
      SELECT total_minutes, active_days, active_sessions
      FROM mart.student_activity_30d_mv
      WHERE student_id = ${studentId}::bigint
      LIMIT 1
    `,
    "mart.student_activity_30d_mv",
  );

  const defaults: StudyActivity30dSummary = {
    totalMinutes: null,
    activeDays: null,
    activeSessions: null,
  };

  if (!rows.length) {
    return defaults;
  }

  const payload = toJsonRecord(rows[0]);
  if (!payload) {
    return defaults;
  }

  const totalMinutes = extractNumber(payload, [
    "total_minutes",
    "minutes_total",
    "minutes",
    "total_min",
  ]);
  const activeDays = extractNumber(payload, ["active_days", "days_active"]);
  const activeSessions = extractNumber(payload, ["active_sessions", "session_days", "sessions"]);

  return {
    totalMinutes:
      totalMinutes != null && Number.isFinite(totalMinutes) ? Math.max(0, Math.round(totalMinutes)) : null,
    activeDays:
      activeDays != null && Number.isFinite(activeDays) ? Math.max(0, Math.round(activeDays)) : null,
    activeSessions:
      activeSessions != null && Number.isFinite(activeSessions)
        ? Math.max(0, Math.round(activeSessions))
        : null,
  };
}

export async function listStudentLessonSessions(
  studentId: number,
  lesson: {
    lessonId?: number | null;
    lessonGlobalSeq?: number | null;
    level?: string | null;
    seq?: number | null;
  },
  limit = 3,
): Promise<CoachPanelLessonSessionEntry[]> {
  noStore();
  const sql = getSqlClient();
  const normalizedLimit = Number.isFinite(limit)
    ? Math.max(1, Math.min(10, Math.trunc(limit)))
    : 3;

  const lessonId = await resolveLessonIdForCoachPanel(sql, studentId, lesson);
  const normalizedLevel = normalizeLessonLevel(lesson.level);

  let rows: SqlRow[] = [];

  if (lessonId != null) {
    rows = await safeQuery(
      sql`
        SELECT attendance_id, checkin_local, checkout_local, session_minutes
        FROM mart.student_last_sessions_by_lesson_v
        WHERE student_id = ${studentId}
          AND lesson_id = ${lessonId}
        ORDER BY checkin_local DESC
        LIMIT ${normalizedLimit}::int
      `,
      "mart.student_last_sessions_by_lesson_v",
    );
  }

  if (!rows.length && normalizedLevel) {
    rows = await safeQuery(
      sql`
        SELECT attendance_id, checkin_local, checkout_local, session_minutes
        FROM mart.student_last_sessions_by_level_v
        WHERE student_id = ${studentId}
          AND level = ${normalizedLevel}
        ORDER BY checkin_local DESC
        LIMIT ${normalizedLimit}::int
      `,
      "mart.student_last_sessions_by_level_v",
    );
  }

  const sessions: CoachPanelLessonSessionEntry[] = [];

  rows.forEach((row) => {
    const payload = toJsonRecord(row);
    if (!payload) {
      return;
    }

    const checkInRaw = extractString(payload, [
      "checkin_local",
      "check_in_local",
      "checkin",
      "check_in",
    ]);
    if (!checkInRaw) {
      return;
    }
    const checkInDate = parseDateTime(checkInRaw);
    if (!checkInDate) {
      return;
    }

    const checkOutRaw = extractString(payload, [
      "checkout_local",
      "check_out_local",
      "checkout",
      "check_out",
    ]);
    const checkOutDate = checkOutRaw ? parseDateTime(checkOutRaw) : null;

    const minutes = extractNumber(payload, ["session_minutes", "minutes"]);
    const attendanceId =
      normalizeInteger(payload.attendance_id ?? payload.attendanceId ?? payload.id) ??
      (() => {
        const timestamp = checkInDate.getTime();
        return Number.isFinite(timestamp) ? Math.trunc(Math.abs(timestamp)) : null;
      })() ??
      sessions.length + 1;

    sessions.push({
      attendanceId,
      sessionMinutes:
        minutes != null && Number.isFinite(minutes) ? Math.max(0, Math.round(minutes)) : null,
      checkIn: toIsoString(checkInDate),
      checkOut: checkOutDate ? toIsoString(checkOutDate) : null,
    });
  });

  return sessions.slice(0, normalizedLimit);
}

async function resolveLessonIdForCoachPanel(
  sql: ReturnType<typeof getSqlClient>,
  studentId: number,
  lesson: {
    lessonId?: number | null;
    lessonGlobalSeq?: number | null;
    level?: string | null;
    seq?: number | null;
  },
): Promise<number | null> {
  const explicitLessonId =
    lesson.lessonId != null && Number.isFinite(lesson.lessonId)
      ? Math.trunc(lesson.lessonId)
      : null;
  if (explicitLessonId != null) {
    return explicitLessonId;
  }

  const normalizedLevel = normalizeLessonLevel(lesson.level);
  const normalizedSeq =
    lesson.seq != null && Number.isFinite(lesson.seq) ? Math.max(0, Math.trunc(lesson.seq)) : null;
  const normalizedGlobalSeq =
    lesson.lessonGlobalSeq != null && Number.isFinite(lesson.lessonGlobalSeq)
      ? Math.trunc(lesson.lessonGlobalSeq)
      : null;

  if (normalizedGlobalSeq != null) {
    const rows = await safeQuery(
      sql`
        SELECT lesson_id
        FROM mart.student_plan_lessons_with_status_v
        WHERE student_id = ${studentId}
          AND lesson_global_seq = ${normalizedGlobalSeq}
        LIMIT 1
      `,
      "mart.student_plan_lessons_with_status_v",
    );

    if (rows.length) {
      const payload = toJsonRecord(rows[0]);
      const lessonId = extractNumber(payload, ["lesson_id"]);
      if (lessonId != null && Number.isFinite(lessonId)) {
        return Math.trunc(lessonId);
      }
    }
  }

  if (normalizedLevel && normalizedSeq != null) {
    const rows = await safeQuery(
      sql`
        SELECT lesson_id
        FROM mart.student_plan_lessons_with_status_v
        WHERE student_id = ${studentId}
          AND level = ${normalizedLevel}
          AND seq = ${normalizedSeq}
        ORDER BY lesson_global_seq
        LIMIT 1
      `,
      "mart.student_plan_lessons_with_status_v",
    );

    if (rows.length) {
      const payload = toJsonRecord(rows[0]);
      const lessonId = extractNumber(payload, ["lesson_id"]);
      if (lessonId != null && Number.isFinite(lessonId)) {
        return Math.trunc(lessonId);
      }
    }
  }

  if (normalizedLevel && normalizedSeq != null) {
    const rows = await safeQuery(
      sql`
        SELECT lesson_id
        FROM mart.lesson_lookup_v
        WHERE level = ${normalizedLevel}
          AND seq = ${normalizedSeq}
        ORDER BY lesson_global_seq
        LIMIT 1
      `,
      "mart.lesson_lookup_v",
    );

    if (rows.length) {
      const payload = toJsonRecord(rows[0]);
      const lessonId = extractNumber(payload, ["lesson_id"]);
      if (lessonId != null && Number.isFinite(lessonId)) {
        return Math.trunc(lessonId);
      }
    }
  }

  if (normalizedGlobalSeq != null) {
    const rows = await safeQuery(
      sql`
        SELECT lesson_id
        FROM mart.lesson_lookup_v
        WHERE lesson_global_seq = ${normalizedGlobalSeq}
        LIMIT 1
      `,
      "mart.lesson_lookup_v",
    );

    if (rows.length) {
      const payload = toJsonRecord(rows[0]);
      const lessonId = extractNumber(payload, ["lesson_id"]);
      if (lessonId != null && Number.isFinite(lessonId)) {
        return Math.trunc(lessonId);
      }
    }
  }

  return null;
}

async function fetchCoachPanelSessions(
  studentId: number,
  limit = 400,
): Promise<CoachPanelSessionSnapshot[]> {
  noStore();
  const sql = getSqlClient();
  const normalizedLimit = Number.isFinite(limit)
    ? Math.max(1, Math.min(2000, Math.trunc(limit)))
    : 400;

  const [lessonRows, levelRows] = await Promise.all([
    safeQuery(
      sql`
        SELECT
          attendance_id,
          lesson_id,
          checkin_local,
          checkout_local,
          session_minutes,
          level,
          seq,
          lesson_global_seq
        FROM mart.student_last_sessions_by_lesson_v
        WHERE student_id = ${studentId}
        ORDER BY checkin_local DESC
        LIMIT ${normalizedLimit}::int
      `,
      "mart.student_last_sessions_by_lesson_v_recent",
    ),
    safeQuery(
      sql`
        SELECT
          attendance_id,
          lesson_id,
          checkin_local,
          checkout_local,
          session_minutes,
          level,
          seq,
          lesson_global_seq
        FROM mart.student_last_sessions_by_level_v
        WHERE student_id = ${studentId}
        ORDER BY checkin_local DESC
        LIMIT ${normalizedLimit}::int
      `,
      "mart.student_last_sessions_by_level_v_recent",
    ),
  ]);

  const rows = [...lessonRows, ...levelRows];
  const snapshotsMap = new Map<string, CoachPanelSessionSnapshot>();

  rows.forEach((row) => {
    const payload = toJsonRecord(row);
    if (!payload) {
      return;
    }

    const attendanceId = normalizeInteger(payload.attendance_id);
    const lessonId = extractNumber(payload, ["lesson_id"]);
    const checkInRaw = extractString(payload, [
      "checkin_local",
      "check_in_local",
      "checkin",
      "check_in",
    ]);
    if (!checkInRaw) {
      return;
    }

    const checkInDate = parseDateTime(checkInRaw);
    if (!checkInDate) {
      return;
    }

    const checkOutRaw = extractString(payload, [
      "checkout_local",
      "check_out_local",
      "checkout",
      "check_out",
    ]);
    const checkOutDate = checkOutRaw ? parseDateTime(checkOutRaw) : null;

    const rawMinutes = extractNumber(payload, ["session_minutes", "minutes"]);
    const computedMinutes =
      rawMinutes != null && Number.isFinite(rawMinutes)
        ? rawMinutes
        : checkOutDate
          ? (checkOutDate.getTime() - checkInDate.getTime()) / 60000
          : 0;

    const normalizedMinutes = Number.isFinite(computedMinutes)
      ? Math.max(0, Math.round(computedMinutes))
      : 0;

    const resolvedAttendanceId =
      attendanceId ??
      (() => {
        const timestamp = checkInDate.getTime();
        return Number.isFinite(timestamp) ? Math.trunc(Math.abs(timestamp)) : null;
      })() ??
      snapshotsMap.size + 1;

    const snapshot: CoachPanelSessionSnapshot = {
      attendanceId: resolvedAttendanceId,
      lessonId: lessonId != null && Number.isFinite(lessonId) ? Math.trunc(lessonId) : null,
      checkInIso: toIsoString(checkInDate),
      checkOutIso: checkOutDate ? toIsoString(checkOutDate) : null,
      localDay: formatGuayaquilDay(checkInDate),
      sessionMinutes: normalizedMinutes,
      level: extractString(payload, ["level", "level_code", "lesson_level"]),
      seq: extractNumber(payload, ["seq", "lesson_seq", "lesson_number"]),
      lessonGlobalSeq: extractNumber(payload, ["lesson_global_seq", "global_seq"]),
    };

    const keyParts = [
      snapshot.attendanceId != null ? `id:${snapshot.attendanceId}` : null,
      snapshot.checkInIso ? `check:${snapshot.checkInIso}` : null,
      snapshot.lessonId != null ? `lesson:${snapshot.lessonId}` : null,
    ].filter(Boolean);
    const key = keyParts.join("|") || `idx:${snapshotsMap.size}`;

    const existing = snapshotsMap.get(key);
    if (!existing || existing.checkInIso < snapshot.checkInIso) {
      snapshotsMap.set(key, snapshot);
    }
  });

  const snapshots = Array.from(snapshotsMap.values());
  snapshots.sort((a, b) => b.checkInIso.localeCompare(a.checkInIso));
  return snapshots;
}

function buildRecentActivityFromSessions(
  sessions: CoachPanelSessionSnapshot[],
  limit: number,
): CoachPanelRecentActivityEntry[] {
  const normalizedLimit = Number.isFinite(limit) ? Math.max(1, Math.trunc(limit)) : 10;
  return sessions.slice(0, normalizedLimit).map((session) => ({
    attendanceId: session.attendanceId,
    sessionMinutes: Number.isFinite(session.sessionMinutes)
      ? session.sessionMinutes
      : null,
    checkIn: session.checkInIso,
    checkOut: session.checkOutIso,
    level: session.level,
    seq: session.seq,
    lessonGlobalSeq: session.lessonGlobalSeq,
  }));
}

export async function getStudentCoachPanelSummary(
  studentId: number,
): Promise<StudentCoachPanelSummary | null> {
  noStore();

  const [
    overview,
    recorrido,
    heatmap,
    leiTrend,
    recentActivity,
    learnerSpeed,
    leiRank,
    hourlyStudy,
    activitySummary,
  ] = await Promise.all([
    getStudentCoachPanelProfileHeader(studentId),
    getStudentLessonRecorrido(studentId),
    listStudentEngagementHeatmap(studentId, 30),
    listStudentLeiTrend(studentId, null),
    listStudentRecentSessions(studentId, 10),
    getStudentLearnerSpeedSummary(studentId),
    getStudentLeiRank(studentId),
    listStudentHourlyStudy30d(studentId),
    getStudentActivity30dSummary(studentId),
  ]);

  if (!overview) {
    return null;
  }

  const lessonJourney: CoachPanelLessonJourney = {
    lessons: recorrido.lessons,
    plannedLevelMin: recorrido.plannedLevelMin ?? overview.header.planLevelMin ?? null,
    plannedLevelMax: recorrido.plannedLevelMax ?? overview.header.planLevelMax ?? null,
  };

  const engagement: CoachPanelEngagement = {
    stats: overview.engagementStats,
    heatmap,
    lei: {
      lei30dPlan: overview.lei30dPlan,
      trend: leiTrend,
    },
  };

  const paceForecast: CoachPanelPaceForecast = {
    forecastMonthsToFinishPlan: overview.header.forecastMonthsToFinishPlan,
    lessonsRemaining: overview.lessonsRemaining,
    totalLessonsInPlan:
      overview.totalLessonsInPlan ?? overview.header.totalLessonsInPlan ?? null,
    onPacePlan: overview.header.onPacePlan,
    planProgressPct: overview.planProgressPct ?? overview.header.planProgressPct ?? null,
  };

  return {
    profileHeader: overview.header,
    lessonJourney,
    engagement,
    paceForecast,
    recentActivity,
    learnerSpeed,
    leiRank,
    studyHistogram: {
      hourly: hourlyStudy,
      summary: activitySummary,
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

function mapAttendanceHistoryRow(row: SqlRow): StudentAttendanceHistoryEntry | null {
  const id = Number(row.id);
  const checkIn = row.checkin_time as string | null;
  if (!Number.isFinite(id) || !checkIn) {
    return null;
  }

  const rawDuration =
    row.duration_minutes == null
      ? null
      : typeof row.duration_minutes === "number"
        ? row.duration_minutes
        : Number(row.duration_minutes);

  return {
    id,
    checkInTime: checkIn,
    checkOutTime: (row.checkout_time as string | null) ?? null,
    lessonLabel: (row.lesson_label as string | null) ?? null,
    levelCode: (row.level_code as string | null) ?? null,
    lessonSequence:
      row.lesson_seq == null
        ? null
        : typeof row.lesson_seq === "number"
          ? Math.trunc(row.lesson_seq)
          : Math.trunc(Number(row.lesson_seq)),
    durationMinutes:
      rawDuration != null && Number.isFinite(rawDuration)
        ? Math.max(0, rawDuration)
        : null,
  } satisfies StudentAttendanceHistoryEntry;
}

async function runBasicDetailsQuery(
  sql: ReturnType<typeof getSqlClient>,
  studentId: number,
  relation: (typeof STUDENT_FLAG_RELATION_CANDIDATES)[number],
): Promise<SqlRow[]> {
  return normalizeRows<SqlRow>(await sql`
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
      s.graduation_date                      AS "graduationDate",
      s.frozen_start                         AS "frozenStart",
      s.frozen_end                           AS "frozenEnd",
      s.current_level::text                  AS "currentLevel",
      s.planned_level_min::text              AS "plannedLevelMin",
      s.planned_level_max::text              AS "plannedLevelMax",
      COALESCE(s.is_online, false)           AS "isOnline",
      COALESCE(s.archived, false)            AS "archived",
      COALESCE(flags.is_new_student, false)  AS "isNewStudent",
      COALESCE(flags.is_exam_preparation, false) AS "isExamPreparation",
      COALESCE(flags.is_absent_7d, false)    AS "isAbsent7d",
      COALESCE(flags.is_absent_7d, false)    AS "isAbsent7Days",
      COALESCE(flags.is_slow_progress_14d, false) AS "isSlowProgress14d",
      COALESCE(flags.is_slow_progress_14d, false) AS "isSlowProgress14Days",
      COALESCE(flags.instructivo_active, false) AS "instructivoActive",
      COALESCE(flags.instructivo_active, false) AS "hasActiveInstructive",
      COALESCE(flags.instructivo_overdue, false) AS "instructivoOverdue",
      COALESCE(flags.instructivo_overdue, false) AS "hasOverdueInstructive",
      s.status                               AS "status"
    FROM public.students AS s
    LEFT JOIN ${sql.unsafe(relation)} AS flags ON flags.student_id = s.id
    WHERE s.id = ${studentId}::bigint
    LIMIT 1
  `);
}

async function fetchStudentBasicDetailsRows(
  sql: ReturnType<typeof getSqlClient>,
  studentId: number,
): Promise<SqlRow[]> {
  let lastError: unknown = null;

  for (const relation of STUDENT_FLAG_RELATION_CANDIDATES) {
    try {
      return await runBasicDetailsQuery(sql, studentId, relation);
    } catch (error) {
      if (isMissingStudentFlagRelation(error, relation)) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  if (lastError) {
    console.warn(
      "No pudimos encontrar una relación de banderas para el perfil del estudiante." +
        " La sección de banderas se mostrará vacía hasta que exista la vista o tabla correspondiente.",
      lastError,
    );
  }

  return [];
}

export async function listStudentAttendanceHistory(
  studentId: number,
  limit = 60,
): Promise<StudentAttendanceHistoryEntry[]> {
  noStore();
  const sql = getSqlClient();

  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.trunc(limit), 200) : 60;

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT
      sa.id,
      sa.checkin_time,
      sa.checkout_time,
      l.lesson AS lesson_label,
      l.level AS level_code,
      l.seq AS lesson_seq,
      EXTRACT(EPOCH FROM (sa.checkout_time - sa.checkin_time)) / 60 AS duration_minutes
    FROM public.student_attendance sa
    LEFT JOIN lessons l ON l.id = sa.lesson_id
    WHERE sa.student_id = ${studentId}::bigint
    ORDER BY sa.checkin_time DESC
    LIMIT ${safeLimit}
  `);

  return rows
    .map(mapAttendanceHistoryRow)
    .filter((entry): entry is StudentAttendanceHistoryEntry => Boolean(entry));
}

export async function createStudentAttendanceEntry({
  studentId,
  lessonId,
  checkIn,
  checkOut = null,
}: {
  studentId: number;
  lessonId: number;
  checkIn: string;
  checkOut?: string | null;
}): Promise<StudentAttendanceHistoryEntry> {
  const sql = getSqlClient();

  const sanitizedStudentId = Math.trunc(studentId);
  if (!Number.isFinite(sanitizedStudentId) || sanitizedStudentId <= 0) {
    throw new Error("El estudiante indicado no es válido.");
  }

  const sanitizedLessonId = Math.trunc(lessonId);
  if (!Number.isFinite(sanitizedLessonId) || sanitizedLessonId <= 0) {
    throw new Error("La lección seleccionada no es válida.");
  }

  const checkInDate = new Date(checkIn);
  if (Number.isNaN(checkInDate.getTime())) {
    throw new Error("La fecha de ingreso no es válida.");
  }

  let checkoutIso: string | null = null;
  if (checkOut) {
    const checkoutDate = new Date(checkOut);
    if (Number.isNaN(checkoutDate.getTime())) {
      throw new Error("La fecha de salida no es válida.");
    }
    if (checkoutDate <= checkInDate) {
      throw new Error("La salida debe ser posterior al ingreso.");
    }
    checkoutIso = checkoutDate.toISOString();
  }

  const insertedRows = normalizeRows<SqlRow>(await sql`
    INSERT INTO public.student_attendance (
      student_id,
      lesson_id,
      checkin_time,
      checkout_time,
      override_ok
    )
    VALUES (
      ${sanitizedStudentId}::bigint,
      ${sanitizedLessonId}::bigint,
      ${checkInDate.toISOString()}::timestamptz,
      ${checkoutIso}::timestamptz,
      false
    )
    RETURNING id
  `);

  if (!insertedRows.length) {
    throw new Error("No se pudo registrar la asistencia manual solicitada.");
  }

  const insertedId = Number(insertedRows[0].id);
  if (!Number.isFinite(insertedId)) {
    throw new Error("El identificador de la asistencia creada no es válido.");
  }

  const detailRows = normalizeRows<SqlRow>(await sql`
    SELECT
      sa.id,
      sa.checkin_time,
      sa.checkout_time,
      l.lesson AS lesson_label,
      l.level AS level_code,
      l.seq AS lesson_seq,
      EXTRACT(EPOCH FROM (sa.checkout_time - sa.checkin_time)) / 60 AS duration_minutes
    FROM public.student_attendance sa
    LEFT JOIN lessons l ON l.id = sa.lesson_id
    WHERE sa.id = ${insertedId}::bigint
    LIMIT 1
  `);

  const mapped = detailRows.length ? mapAttendanceHistoryRow(detailRows[0]) : null;
  if (!mapped) {
    throw new Error("No se pudo recuperar la asistencia creada.");
  }

  return mapped;
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
