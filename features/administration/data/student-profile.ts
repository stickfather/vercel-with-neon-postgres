import { getSqlClient, normalizeRows, SqlRow } from "@/lib/db/client";

export type BasicDetailFieldKey =
  | "fullName"
  | "preferredName"
  | "email"
  | "phone"
  | "whatsapp"
  | "birthdate"
  | "startDate"
  | "currentLevel"
  | "currentLesson"
  | "status"
  | "notes";

type BasicDetailFieldConfig = {
  key: BasicDetailFieldKey;
  dbColumn: string;
  label: string;
  type: "text" | "textarea" | "date" | "number";
  editable: boolean;
};

export type BasicDetailField = Omit<BasicDetailFieldConfig, "dbColumn"> & {
  value: string | null;
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
    key: "preferredName",
    dbColumn: "preferred_name",
    label: "Nombre preferido",
    type: "text",
    editable: true,
  },
  {
    key: "email",
    dbColumn: "email",
    label: "Correo electrónico",
    type: "text",
    editable: true,
  },
  {
    key: "phone",
    dbColumn: "phone",
    label: "Teléfono",
    type: "text",
    editable: true,
  },
  {
    key: "whatsapp",
    dbColumn: "whatsapp",
    label: "WhatsApp",
    type: "text",
    editable: true,
  },
  {
    key: "birthdate",
    dbColumn: "birthdate",
    label: "Fecha de nacimiento",
    type: "date",
    editable: true,
  },
  {
    key: "startDate",
    dbColumn: "start_date",
    label: "Fecha de inicio",
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
    key: "currentLesson",
    dbColumn: "current_lesson",
    label: "Lección actual",
    type: "text",
    editable: true,
  },
  {
    key: "status",
    dbColumn: "status",
    label: "Estado",
    type: "text",
    editable: false,
  },
  {
    key: "notes",
    dbColumn: "notes",
    label: "Notas",
    type: "textarea",
    editable: true,
  },
];

export const BASIC_DETAIL_FIELD_KEYS: ReadonlyArray<BasicDetailFieldKey> =
  BASIC_DETAILS_FIELDS.map((field) => field.key);

export function isBasicDetailFieldKey(value: string): value is BasicDetailFieldKey {
  return BASIC_DETAILS_FIELDS.some((field) => field.key === value);
}

function normalizeFieldValue(value: unknown, type: BasicDetailField["type"]): string | null {
  if (value == null) return null;
  if (type === "date") {
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }
    const isoString = String(value).trim();
    if (!isoString) return null;
    return isoString.slice(0, 10);
  }
  if (typeof value === "string") return value;
  return String(value);
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
  value: string | null,
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
    case "preferredName":
      await sql`UPDATE public.students SET preferred_name = ${sanitizedValue} WHERE id = ${studentId}`;
      break;
    case "email":
      await sql`UPDATE public.students SET email = ${sanitizedValue} WHERE id = ${studentId}`;
      break;
    case "phone":
      await sql`UPDATE public.students SET phone = ${sanitizedValue} WHERE id = ${studentId}`;
      break;
    case "whatsapp":
      await sql`UPDATE public.students SET whatsapp = ${sanitizedValue} WHERE id = ${studentId}`;
      break;
    case "birthdate":
      await sql`UPDATE public.students SET birthdate = ${sanitizedValue} WHERE id = ${studentId}`;
      break;
    case "startDate":
      await sql`UPDATE public.students SET start_date = ${sanitizedValue} WHERE id = ${studentId}`;
      break;
    case "currentLevel":
      await sql`UPDATE public.students SET current_level = ${sanitizedValue} WHERE id = ${studentId}`;
      break;
    case "currentLesson":
      await sql`UPDATE public.students SET current_lesson = ${sanitizedValue} WHERE id = ${studentId}`;
      break;
    case "notes":
      await sql`UPDATE public.students SET notes = ${sanitizedValue} WHERE id = ${studentId}`;
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
  status: string | null;
  notes: string | null;
};

export async function listStudentPaymentSchedule(
  studentId: number,
): Promise<StudentPaymentScheduleEntry[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT id, student_id, due_date, amount, status, notes
    FROM public.student_payment_schedule
    WHERE student_id = ${studentId}
    ORDER BY due_date ASC NULLS LAST, id ASC
  `);

  return rows.map((row) => ({
    id: Number(row.id),
    studentId: Number(row.student_id ?? studentId),
    dueDate: normalizeFieldValue(row.due_date, "date"),
    amount:
      row.amount == null
        ? null
        : typeof row.amount === "number"
          ? row.amount
          : Number(row.amount),
    status: (row.status as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
  }));
}

export async function createPaymentScheduleEntry(
  studentId: number,
  data: { dueDate: string | null; amount: number | null; status: string | null; notes: string | null },
): Promise<StudentPaymentScheduleEntry> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    INSERT INTO public.student_payment_schedule (student_id, due_date, amount, status, notes)
    VALUES (${studentId}, ${data.dueDate}, ${data.amount}, ${data.status}, ${data.notes})
    RETURNING id, student_id, due_date, amount, status, notes
  `);

  if (!rows.length) {
    throw new Error("No se pudo crear el cronograma de pagos.");
  }

  const entry = rows[0];
  return {
    id: Number(entry.id),
    studentId: Number(entry.student_id ?? studentId),
    dueDate: normalizeFieldValue(entry.due_date, "date"),
    amount:
      entry.amount == null
        ? null
        : typeof entry.amount === "number"
          ? entry.amount
          : Number(entry.amount),
    status: (entry.status as string | null) ?? null,
    notes: (entry.notes as string | null) ?? null,
  };
}

export async function updatePaymentScheduleEntry(
  entryId: number,
  data: { dueDate: string | null; amount: number | null; status: string | null; notes: string | null },
): Promise<void> {
  const sql = getSqlClient();

  await sql`
    UPDATE public.student_payment_schedule
    SET due_date = ${data.dueDate},
      amount = ${data.amount},
      status = ${data.status},
      notes = ${data.notes}
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
  category: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export async function listStudentNotes(studentId: number): Promise<StudentNote[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT id, student_id, note, category, created_at, updated_at
    FROM public.student_notes
    WHERE student_id = ${studentId}
    ORDER BY created_at DESC NULLS LAST, id DESC
  `);

  return rows.map((row) => ({
    id: Number(row.id),
    studentId: Number(row.student_id ?? studentId),
    note: ((row.note as string | null) ?? "").trim(),
    category: (row.category as string | null) ?? null,
    createdAt: normalizeFieldValue(row.created_at, "date"),
    updatedAt: normalizeFieldValue(row.updated_at, "date"),
  }));
}

export async function createStudentNote(
  studentId: number,
  data: { note: string; category: string | null },
): Promise<StudentNote> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    INSERT INTO public.student_notes (student_id, note, category)
    VALUES (${studentId}, ${data.note}, ${data.category})
    RETURNING id, student_id, note, category, created_at, updated_at
  `);

  if (!rows.length) {
    throw new Error("No se pudo crear la nota.");
  }

  const row = rows[0];
  return {
    id: Number(row.id),
    studentId: Number(row.student_id ?? studentId),
    note: ((row.note as string | null) ?? "").trim(),
    category: (row.category as string | null) ?? null,
    createdAt: normalizeFieldValue(row.created_at, "date"),
    updatedAt: normalizeFieldValue(row.updated_at, "date"),
  };
}

export async function updateStudentNote(
  noteId: number,
  data: { note: string; category: string | null },
): Promise<void> {
  const sql = getSqlClient();
  await sql`
    UPDATE public.student_notes
    SET note = ${data.note},
      category = ${data.category}
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
  examDate: string | null;
  examType: string | null;
  status: string | null;
  location: string | null;
  result: string | null;
  notes: string | null;
};

export async function listStudentExams(studentId: number): Promise<StudentExam[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT id, student_id, exam_date, exam_type, status, location, result, notes
    FROM public.exam_appointments
    WHERE student_id = ${studentId}
    ORDER BY exam_date DESC NULLS LAST, id DESC
  `);

  return rows.map((row) => ({
    id: Number(row.id),
    studentId: Number(row.student_id ?? studentId),
    examDate: normalizeFieldValue(row.exam_date, "date"),
    examType: (row.exam_type as string | null) ?? null,
    status: (row.status as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    result: (row.result as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
  }));
}

export async function createStudentExam(
  studentId: number,
  data: {
    examDate: string | null;
    examType: string | null;
    status: string | null;
    location: string | null;
    result: string | null;
    notes: string | null;
  },
): Promise<StudentExam> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    INSERT INTO public.exam_appointments (student_id, exam_date, exam_type, status, location, result, notes)
    VALUES (${studentId}, ${data.examDate}, ${data.examType}, ${data.status}, ${data.location}, ${data.result}, ${data.notes})
    RETURNING id, student_id, exam_date, exam_type, status, location, result, notes
  `);

  if (!rows.length) {
    throw new Error("No se pudo crear el examen.");
  }

  const row = rows[0];
  return {
    id: Number(row.id),
    studentId: Number(row.student_id ?? studentId),
    examDate: normalizeFieldValue(row.exam_date, "date"),
    examType: (row.exam_type as string | null) ?? null,
    status: (row.status as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    result: (row.result as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
  };
}

export async function updateStudentExam(
  examId: number,
  data: {
    examDate: string | null;
    examType: string | null;
    status: string | null;
    location: string | null;
    result: string | null;
    notes: string | null;
  },
): Promise<void> {
  const sql = getSqlClient();

  await sql`
    UPDATE public.exam_appointments
    SET exam_date = ${data.examDate},
      exam_type = ${data.examType},
      status = ${data.status},
      location = ${data.location},
      result = ${data.result},
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

export type StudentProgressStats = {
  averageSessionLengthMinutes: number | null;
  averageDaysPerWeek: number | null;
  averageProgressPerWeek: number | null;
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
  lesson: string | null;
  level: string | null;
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
    };
  }

  const row = rows[0];
  const avgSession = row.average_session_length_minutes ?? row.avg_session_length_minutes ?? row.avg_session_length ?? null;
  const avgDays = row.average_days_per_week ?? row.avg_days_per_week ?? null;
  const avgProgress = row.average_rate_of_progress_per_week ?? row.avg_progress_per_week ?? row.average_progress_per_week ?? null;

  const normalizeNumber = (value: unknown): number | null => {
    if (value == null) return null;
    if (typeof value === "number") return value;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return {
    averageSessionLengthMinutes: normalizeNumber(avgSession),
    averageDaysPerWeek: normalizeNumber(avgDays),
    averageProgressPerWeek: normalizeNumber(avgProgress),
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
  excludeSundays: boolean,
): Promise<CumulativeHoursEntry[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT *
    FROM public.get_student_cumulative_hours(${studentId}, ${startDate}, ${endDate}, ${excludeSundays})
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
  excludeSundays: boolean,
): Promise<LessonTimelineEntry[]> {
  const sql = getSqlClient();

  const rows = normalizeRows<SqlRow>(await sql`
    SELECT *
    FROM public.get_student_daily_lesson(${studentId}, ${startDate}, ${endDate}, ${excludeSundays})
  `);

  return rows
    .map((row) => ({
      date: normalizeFieldValue(row.date ?? row.day ?? row.session_date, "date") ?? "",
      lesson: (row.lesson as string | null) ?? null,
      level: (row.level as string | null) ?? null,
    }))
    .filter((entry) => entry.date.length > 0);
}
