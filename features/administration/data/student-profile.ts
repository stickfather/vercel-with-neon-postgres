import { getSqlClient, normalizeRows, SqlRow } from "@/lib/db/client";

export type BasicDetailFieldKey =
  | "fullName"
  | "representativeName"
  | "representativePhone"
  | "representativeEmail"
  | "hasSpecialNeeds"
  | "contractStart"
  | "contractEnd"
  | "frozenStart"
  | "frozenEnd"
  | "currentLevel"
  | "plannedLevelMin"
  | "plannedLevelMax"
  | "isOnline"
  | "lastSeenAt"
  | "lastLessonId"
  | "status";

type BasicDetailFieldType =
  | "text"
  | "textarea"
  | "date"
  | "number"
  | "boolean"
  | "datetime";

type BasicDetailFieldConfig = {
  key: BasicDetailFieldKey;
  dbColumn: string;
  label: string;
  type: BasicDetailFieldType;
  editable: boolean;
};

export type BasicDetailField = Omit<BasicDetailFieldConfig, "dbColumn"> & {
  value: string | boolean | null;
};

export type StudentBasicDetails = {
  id: number;
  fullName: string;
  fields: BasicDetailField[];
};

const BASIC_DETAILS_FIELDS: ReadonlyArray<BasicDetailFieldConfig> = [
  {
    key: "fullName",
    dbColumn: "full_name",
    label: "Nombre completo",
    type: "text",
    editable: true,
  },
  {
    key: "representativeName",
    dbColumn: "representative_name",
    label: "Nombre del representante",
    type: "text",
    editable: true,
  },
  {
    key: "representativePhone",
    dbColumn: "representative_phone",
    label: "Teléfono del representante",
    type: "text",
    editable: true,
  },
  {
    key: "representativeEmail",
    dbColumn: "representative_email",
    label: "Correo del representante",
    type: "text",
    editable: true,
  },
  {
    key: "hasSpecialNeeds",
    dbColumn: "has_special_needs",
    label: "Necesidades especiales",
    type: "boolean",
    editable: true,
  },
  {
    key: "contractStart",
    dbColumn: "contract_start",
    label: "Inicio de contrato",
    type: "date",
    editable: true,
  },
  {
    key: "contractEnd",
    dbColumn: "contract_end",
    label: "Fin de contrato",
    type: "date",
    editable: true,
  },
  {
    key: "frozenStart",
    dbColumn: "frozen_start",
    label: "Inicio de congelamiento",
    type: "date",
    editable: true,
  },
  {
    key: "frozenEnd",
    dbColumn: "frozen_end",
    label: "Fin de congelamiento",
    type: "date",
    editable: true,
  },
  {
    key: "currentLevel",
    dbColumn: "current_level",
    label: "Nivel actual",
    type: "text",
    editable: true,
  },
  {
    key: "plannedLevelMin",
    dbColumn: "planned_level_min",
    label: "Nivel planificado mínimo",
    type: "text",
    editable: true,
  },
  {
    key: "plannedLevelMax",
    dbColumn: "planned_level_max",
    label: "Nivel planificado máximo",
    type: "text",
    editable: true,
  },
  {
    key: "isOnline",
    dbColumn: "is_online",
    label: "Modalidad en línea",
    type: "boolean",
    editable: true,
  },
  {
    key: "lastSeenAt",
    dbColumn: "last_seen_at",
    label: "Última asistencia",
    type: "datetime",
    editable: false,
  },
  {
    key: "lastLessonId",
    dbColumn: "last_lesson_id",
    label: "Última lección",
    type: "text",
    editable: false,
  },
  {
    key: "status",
    dbColumn: "status",
    label: "Estado",
    type: "text",
    editable: false,
  },
];

export const BASIC_DETAIL_FIELD_KEYS: ReadonlyArray<BasicDetailFieldKey> =
  BASIC_DETAILS_FIELDS.map((field) => field.key);

export function isBasicDetailFieldKey(value: string): value is BasicDetailFieldKey {
  return BASIC_DETAILS_FIELDS.some((field) => field.key === value);
}

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

export async function getStudentBasicDetails(studentId: number): Promise<StudentBasicDetails | null> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT *
    FROM public.students
    WHERE id = ${studentId}
    LIMIT 1
  `);

  if (!rows.length) return null;

  const row = rows[0];
  const id = Number(row.id ?? studentId);
  const fullName = ((row.full_name as string | null) ?? "").trim();

  const fields: BasicDetailField[] = BASIC_DETAILS_FIELDS.map((field) => ({
    key: field.key,
    label: field.label,
    type: field.type,
    editable: field.editable,
    value: normalizeFieldValue(row[field.dbColumn], field.type),
  }));

  return {
    id,
    fullName,
    fields,
  };
}

export async function updateStudentBasicField(
  studentId: number,
  fieldKey: BasicDetailFieldKey,
  value: string | boolean | null,
): Promise<void> {
  const sql = getSqlClient();
  const field = BASIC_DETAILS_FIELDS.find((item) => item.key === fieldKey);

  if (!field) {
    throw new Error("El campo seleccionado no existe o no es editable.");
  }

  if (!field.editable) {
    throw new Error("Este campo es administrado automáticamente y no puede editarse.");
  }

  const sanitizedValue = value === undefined ? null : value;

  switch (field.key) {
    case "fullName":
      await sql`UPDATE public.students SET full_name = ${sanitizedValue} WHERE id = ${studentId}`;
      break;
    case "representativeName":
      await sql`UPDATE public.students SET representative_name = ${sanitizedValue} WHERE id = ${studentId}`;
      break;
    case "representativePhone":
      await sql`UPDATE public.students SET representative_phone = ${sanitizedValue} WHERE id = ${studentId}`;
      break;
    case "representativeEmail":
      await sql`UPDATE public.students SET representative_email = ${sanitizedValue} WHERE id = ${studentId}`;
      break;
    case "hasSpecialNeeds":
      await sql`UPDATE public.students SET has_special_needs = ${sanitizedValue} WHERE id = ${studentId}`;
      break;
    case "contractStart":
      await sql`UPDATE public.students SET contract_start = ${sanitizedValue} WHERE id = ${studentId}`;
      break;
    case "contractEnd":
      await sql`UPDATE public.students SET contract_end = ${sanitizedValue} WHERE id = ${studentId}`;
      break;
    case "frozenStart":
      await sql`UPDATE public.students SET frozen_start = ${sanitizedValue} WHERE id = ${studentId}`;
      break;
    case "frozenEnd":
      await sql`UPDATE public.students SET frozen_end = ${sanitizedValue} WHERE id = ${studentId}`;
      break;
    case "currentLevel":
      await sql`UPDATE public.students SET current_level = ${sanitizedValue} WHERE id = ${studentId}`;
      break;
    case "plannedLevelMin":
      await sql`UPDATE public.students SET planned_level_min = ${sanitizedValue} WHERE id = ${studentId}`;
      break;
    case "plannedLevelMax":
      await sql`UPDATE public.students SET planned_level_max = ${sanitizedValue} WHERE id = ${studentId}`;
      break;
    case "isOnline":
      await sql`UPDATE public.students SET is_online = ${sanitizedValue} WHERE id = ${studentId}`;
      break;
    default:
      throw new Error("No se puede actualizar el campo especificado.");
  }
}

export type StudentPaymentScheduleEntry = {
  id: number;
  studentId: number;
  dueDate: string | null;
  amount: number | null;
  isPaid: boolean;
  receivedDate: string | null;
  externalRef: string | null;
  note: string | null;
};

export async function listStudentPaymentSchedule(
  studentId: number,
): Promise<StudentPaymentScheduleEntry[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT id, student_id, due_date, amount, is_paid, received_date, external_ref, note
    FROM public.student_payment_schedule
    WHERE student_id = ${studentId}
    ORDER BY due_date ASC NULLS LAST, id ASC
  `);

  return rows.map((row) => {
    const isPaidValue = normalizeFieldValue(row.is_paid, "boolean");
    const dueDateValue = normalizeFieldValue(row.due_date, "date");
    const receivedDateValue = normalizeFieldValue(row.received_date, "date");
    const externalRefValue = normalizeFieldValue(row.external_ref, "text");
    const noteValue = normalizeFieldValue(row.note, "text");

    return {
      id: Number(row.id),
      studentId: Number(row.student_id ?? studentId),
      dueDate: typeof dueDateValue === "string" ? dueDateValue : null,
      amount:
        row.amount == null
          ? null
          : typeof row.amount === "number"
            ? row.amount
            : Number(row.amount),
      isPaid: typeof isPaidValue === "boolean" ? isPaidValue : false,
      receivedDate: typeof receivedDateValue === "string" ? receivedDateValue : null,
      externalRef: typeof externalRefValue === "string" ? externalRefValue : null,
      note: typeof noteValue === "string" ? noteValue : null,
    };
  });
}

export async function createPaymentScheduleEntry(
  studentId: number,
  data: {
    dueDate: string | null;
    amount: number | null;
    isPaid?: boolean | null;
    receivedDate?: string | null;
    externalRef?: string | null;
    note?: string | null;
  },
): Promise<StudentPaymentScheduleEntry> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    INSERT INTO public.student_payment_schedule (
      student_id,
      due_date,
      amount,
      is_paid,
      received_date,
      external_ref,
      note
    )
    VALUES (
      ${studentId},
      ${data.dueDate},
      ${data.amount},
      ${data.isPaid ?? false},
      ${data.receivedDate ?? null},
      ${data.externalRef ?? null},
      ${data.note ?? null}
    )
    RETURNING id, student_id, due_date, amount, is_paid, received_date, external_ref, note
  `);

  if (!rows.length) {
    throw new Error("No se pudo crear el cronograma de pagos.");
  }

  const entry = rows[0];
  const created = await listStudentPaymentSchedule(studentId);
  const fresh = created.find((item) => item.id === Number(entry.id));
  if (!fresh) {
    throw new Error("No se pudo recuperar el pago creado.");
  }

  return fresh;
}

export async function updatePaymentScheduleEntry(
  entryId: number,
  data: {
    dueDate: string | null;
    amount: number | null;
    isPaid: boolean;
    receivedDate: string | null;
    externalRef: string | null;
    note: string | null;
  },
): Promise<void> {
  const sql = getSqlClient();

  await sql`
    UPDATE public.student_payment_schedule
    SET due_date = ${data.dueDate},
      amount = ${data.amount},
      is_paid = ${data.isPaid},
      received_date = ${data.receivedDate},
      external_ref = ${data.externalRef},
      note = ${data.note}
    WHERE id = ${entryId}
  `;
}

export async function deletePaymentScheduleEntry(entryId: number): Promise<void> {
  const sql = getSqlClient();
  await sql`
    DELETE FROM public.student_payment_schedule
    WHERE id = ${entryId}
  `;
}

export type StudentNote = {
  id: number;
  studentId: number;
  note: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export async function listStudentNotes(studentId: number): Promise<StudentNote[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT id, student_id, note, created_at, updated_at
    FROM public.student_notes
    WHERE student_id = ${studentId}
    ORDER BY created_at DESC NULLS LAST, id DESC
  `);

  return rows.map((row) => ({
    id: Number(row.id),
    studentId: Number(row.student_id ?? studentId),
    note: ((row.note as string | null) ?? "").trim(),
    createdAt: normalizeFieldValue(row.created_at, "datetime"),
    updatedAt: normalizeFieldValue(row.updated_at, "datetime"),
  }));
}

export async function createStudentNote(
  studentId: number,
  data: { note: string },
): Promise<StudentNote> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    INSERT INTO public.student_notes (student_id, note)
    VALUES (${studentId}, ${data.note})
    RETURNING id, student_id, note, created_at, updated_at
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
    updatedAt: normalizeFieldValue(row.updated_at, "datetime"),
  };
}

export async function updateStudentNote(
  noteId: number,
  data: { note: string },
): Promise<void> {
  const sql = getSqlClient();
  await sql`
    UPDATE public.student_notes
    SET note = ${data.note}
    WHERE id = ${noteId}
  `;
}

export async function deleteStudentNote(noteId: number): Promise<void> {
  const sql = getSqlClient();
  await sql`
    DELETE FROM public.student_notes
    WHERE id = ${noteId}
  `;
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

export async function listStudentExams(studentId: number): Promise<StudentExam[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT id, student_id, time_scheduled, status, score, passed, notes
    FROM public.exam_appointments
    WHERE student_id = ${studentId}
    ORDER BY time_scheduled DESC NULLS LAST, id DESC
  `);

  return rows.map((row) => {
    const passedValue = normalizeFieldValue(row.passed, "boolean");
    return {
      id: Number(row.id),
      studentId: Number(row.student_id ?? studentId),
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
  });
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
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    INSERT INTO public.exam_appointments (student_id, time_scheduled, status, score, passed, notes)
    VALUES (${studentId}, ${data.timeScheduled}, ${data.status ?? "scheduled"}, ${data.score}, ${data.passed}, ${data.notes})
    RETURNING id, student_id, time_scheduled, status, score, passed, notes
  `);

  if (!rows.length) {
    throw new Error("No se pudo crear el examen.");
  }

  const created = await listStudentExams(studentId);
  const fresh = created.find((exam) => exam.id === Number(rows[0].id));
  if (!fresh) {
    throw new Error("No se pudo recuperar el examen creado.");
  }

  return fresh;
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
): Promise<void> {
  const sql = getSqlClient();

  await sql`
    UPDATE public.exam_appointments
    SET time_scheduled = ${data.timeScheduled},
      status = ${data.status},
      score = ${data.score},
      passed = ${data.passed},
      notes = ${data.notes}
    WHERE id = ${examId}
  `;
}

export async function deleteStudentExam(examId: number): Promise<void> {
  const sql = getSqlClient();
  await sql`
    DELETE FROM public.exam_appointments
    WHERE id = ${examId}
  `;
}

export type StudentInstructivo = {
  id: number;
  studentId: number;
  examId: number | null;
  assignedAt: string | null;
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
  notes: string | null;
};

export async function listStudentInstructivos(
  studentId: number,
): Promise<StudentInstructivo[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT id, student_id, exam_id, assigned_at, due_date, completed, completed_at, notes
    FROM public.student_instructivos
    WHERE student_id = ${studentId}
    ORDER BY due_date ASC NULLS LAST, id ASC
  `);

  return rows.map((row) => {
    const completedValue = normalizeFieldValue(row.completed, "boolean");
    return {
      id: Number(row.id),
      studentId: Number(row.student_id ?? studentId),
      examId:
        row.exam_id == null
          ? null
          : typeof row.exam_id === "number"
            ? row.exam_id
            : Number(row.exam_id),
      assignedAt: normalizeFieldValue(row.assigned_at, "datetime"),
      dueDate: normalizeFieldValue(row.due_date, "datetime"),
      completed: typeof completedValue === "boolean" ? completedValue : false,
      completedAt: normalizeFieldValue(row.completed_at, "datetime"),
      notes: normalizeFieldValue(row.notes, "text"),
    };
  });
}

export async function createStudentInstructivo(
  studentId: number,
  data: {
    examId: number | null;
    assignedAt?: string | null;
    dueDate: string | null;
    completed?: boolean;
    completedAt?: string | null;
    notes?: string | null;
  },
): Promise<StudentInstructivo> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    INSERT INTO public.student_instructivos (student_id, exam_id, assigned_at, due_date, completed, completed_at, notes)
    VALUES (
      ${studentId},
      ${data.examId},
      COALESCE(${data.assignedAt}, now()),
      ${data.dueDate},
      ${data.completed ?? false},
      ${data.completedAt ?? null},
      ${data.notes ?? null}
    )
    RETURNING id
  `);

  if (!rows.length) {
    throw new Error("No se pudo crear el instructivo.");
  }

  const created = await listStudentInstructivos(studentId);
  const fresh = created.find((item) => item.id === Number(rows[0].id));
  if (!fresh) {
    throw new Error("No se pudo recuperar el instructivo creado.");
  }

  return fresh;
}

export async function updateStudentInstructivo(
  instructivoId: number,
  data: {
    examId: number | null;
    dueDate: string | null;
    completed: boolean;
    completedAt: string | null;
    notes: string | null;
  },
): Promise<void> {
  const sql = getSqlClient();
  await sql`
    UPDATE public.student_instructivos
    SET exam_id = ${data.examId},
      due_date = ${data.dueDate},
      completed = ${data.completed},
      completed_at = ${data.completedAt},
      notes = ${data.notes}
    WHERE id = ${instructivoId}
  `;
}

export async function deleteStudentInstructivo(
  instructivoId: number,
): Promise<void> {
  const sql = getSqlClient();
  await sql`
    DELETE FROM public.student_instructivos
    WHERE id = ${instructivoId}
  `;
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
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT *
    FROM public.get_student_progress_stats(${studentId}, ${startDate}, ${endDate}, ${excludeSundays})
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
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT *
    FROM public.get_student_minutes_by_day(${studentId}, ${startDate}, ${endDate}, ${excludeSundays})
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
    .filter((entry) => entry.date.length > 0);
}

export async function getStudentCumulativeHours(
  studentId: number,
  startDate: string,
  endDate: string,
): Promise<CumulativeHoursEntry[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT *
    FROM public.get_student_cumulative_hours(${studentId}, ${startDate}, ${endDate})
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
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT *
    FROM public.get_student_daily_lesson(${studentId}, ${startDate}, ${endDate})
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
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT *
    FROM public.get_student_attendance_stats(${studentId}, ${startDate}, ${endDate})
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
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT *
    FROM public.get_student_progress_events(${studentId})
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
