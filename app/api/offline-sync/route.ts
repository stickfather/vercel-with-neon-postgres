import { NextResponse } from "next/server";

import { getSqlClient, normalizeRows, type SqlRow } from "@/lib/db/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const VALID_KINDS = new Set([
  "student_checkin",
  "student_checkout",
  "staff_checkin",
  "staff_checkout",
] as const);

type OfflineEventKind = typeof VALID_KINDS extends Set<infer T> ? T : never;

type PendingPayload = {
  student_id?: number;
  staff_id?: number;
  lesson_id?: number;
  attendance_id?: number;
  checkin_time?: string;
  checkout_time?: string;
  auto_checkout?: boolean;
  confirm_override?: boolean;
};

type OfflineSyncRequest = {
  id?: string;
  kind?: OfflineEventKind;
  payload?: PendingPayload;
};

type OfflineLogRow = SqlRow & {
  event_uuid?: unknown;
  success?: unknown;
  error_text?: unknown;
};

async function ensureOfflineLogTable(sql = getSqlClient()): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS public.offline_event_log (
      event_uuid text PRIMARY KEY,
      kind text NOT NULL,
      processed_at timestamptz DEFAULT now(),
      success boolean NOT NULL,
      error_text text
    )
  `;
}

function isValidIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime());
}

function normalizeBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "t" || normalized === "yes") return true;
    if (normalized === "false" || normalized === "0" || normalized === "f" || normalized === "no") return false;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  return fallback;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

async function logEventResult(
  sql = getSqlClient(),
  id: string,
  kind: OfflineEventKind,
  success: boolean,
  errorText: string | null,
): Promise<void> {
  await sql`
    INSERT INTO public.offline_event_log(event_uuid, kind, success, error_text)
    VALUES (${id}, ${kind}, ${success}, ${errorText})
    ON CONFLICT (event_uuid)
    DO UPDATE SET success = EXCLUDED.success, error_text = EXCLUDED.error_text, processed_at = now()
  `;
}

async function handleStudentCheckIn(
  sql = getSqlClient(),
  payload: PendingPayload,
): Promise<void> {
  const studentId = toNumber(payload.student_id);
  const lessonId = toNumber(payload.lesson_id);
  const checkinTime = payload.checkin_time;
  if (!studentId || !lessonId || !isValidIso(checkinTime)) {
    throw new Error("Datos incompletos para el check-in de estudiantes.");
  }

  const rows = normalizeRows<{ attendance_id?: unknown }>(
    await sql`
      SELECT public.student_checkin(${studentId}::bigint, ${lessonId}::bigint) AS attendance_id
    `,
  );

  const attendanceIdRaw = rows[0]?.attendance_id;
  const attendanceId = attendanceIdRaw != null ? Number(attendanceIdRaw) : Number.NaN;

  if (!Number.isFinite(attendanceId)) {
    throw new Error("No pudimos registrar la asistencia del estudiante.");
  }

  const confirmOverride = normalizeBoolean(payload.confirm_override, false);
  if (confirmOverride) {
    await sql`
      UPDATE public.student_attendance
      SET override_ok = TRUE
      WHERE id = ${attendanceId}::bigint
    `;
  }

  const updated = normalizeRows<{ id?: unknown }>(
    await sql`
      UPDATE public.student_attendance
      SET checkin_time = ${checkinTime}::timestamptz,
          auto_checkout = ${normalizeBoolean(payload.auto_checkout, false)}
      WHERE id = ${attendanceId}::bigint
        AND student_id = ${studentId}::bigint
      RETURNING id
    `,
  );

  if (!updated.length) {
    throw new Error("No pudimos actualizar la asistencia recién creada.");
  }
}

async function handleStudentCheckout(
  sql = getSqlClient(),
  payload: PendingPayload,
): Promise<void> {
  const studentId = toNumber(payload.student_id);
  const attendanceId = toNumber(payload.attendance_id);
  const checkoutTime = payload.checkout_time;
  if (!isValidIso(checkoutTime)) {
    throw new Error("La hora de salida enviada no es válida.");
  }

  const autoCheckout = normalizeBoolean(payload.auto_checkout, false);

  if (attendanceId) {
    const result = normalizeRows<{ id?: unknown }>(
      await sql`
        UPDATE public.student_attendance
        SET checkout_time = ${checkoutTime}::timestamptz,
            auto_checkout = ${autoCheckout}
        WHERE id = ${attendanceId}::bigint
        RETURNING id
      `,
    );
    if (result.length) {
      return;
    }
  }

  if (!studentId) {
    throw new Error("Falta el identificador del estudiante para cerrar la asistencia.");
  }

  const updated = normalizeRows<{ id?: unknown }>(
    await sql`
      WITH target AS (
        SELECT id
        FROM public.student_attendance
        WHERE student_id = ${studentId}::bigint
          AND checkout_time IS NULL
        ORDER BY checkin_time DESC
        LIMIT 1
      )
      UPDATE public.student_attendance
      SET checkout_time = ${checkoutTime}::timestamptz,
          auto_checkout = ${autoCheckout}
      WHERE id IN (SELECT id FROM target)
      RETURNING id
    `,
  );

  if (!updated.length) {
    throw new Error("No encontramos una asistencia abierta para este estudiante.");
  }
}

async function handleStaffCheckIn(
  sql = getSqlClient(),
  payload: PendingPayload,
): Promise<void> {
  const staffId = toNumber(payload.staff_id);
  const checkinTime = payload.checkin_time;
  if (!staffId || !isValidIso(checkinTime)) {
    throw new Error("Datos incompletos para registrar al personal.");
  }

  await sql`
    INSERT INTO public.staff_attendance (staff_id, checkin_time, auto_checkout)
    VALUES (${staffId}::bigint, ${checkinTime}::timestamptz, ${normalizeBoolean(payload.auto_checkout, false)})
    ON CONFLICT DO NOTHING
  `;
}

async function handleStaffCheckout(
  sql = getSqlClient(),
  payload: PendingPayload,
): Promise<void> {
  const staffId = toNumber(payload.staff_id);
  const checkoutTime = payload.checkout_time;
  if (!staffId || !isValidIso(checkoutTime)) {
    throw new Error("Datos incompletos para cerrar la asistencia del personal.");
  }

  const autoCheckout = normalizeBoolean(payload.auto_checkout, false);

  const updated = normalizeRows<{ id?: unknown }>(
    await sql`
      WITH target AS (
        SELECT id
        FROM public.staff_attendance
        WHERE staff_id = ${staffId}::bigint
          AND checkout_time IS NULL
        ORDER BY checkin_time DESC
        LIMIT 1
      )
      UPDATE public.staff_attendance
      SET checkout_time = ${checkoutTime}::timestamptz,
          auto_checkout = ${autoCheckout}
      WHERE id IN (SELECT id FROM target)
      RETURNING id
    `,
  );

  if (!updated.length) {
    throw new Error("No encontramos una asistencia abierta del personal.");
  }
}

async function processEvent(
  sql = getSqlClient(),
  kind: OfflineEventKind,
  payload: PendingPayload,
): Promise<void> {
  switch (kind) {
    case "student_checkin":
      await handleStudentCheckIn(sql, payload);
      return;
    case "student_checkout":
      await handleStudentCheckout(sql, payload);
      return;
    case "staff_checkin":
      await handleStaffCheckIn(sql, payload);
      return;
    case "staff_checkout":
      await handleStaffCheckout(sql, payload);
      return;
    default:
      throw new Error("Tipo de evento desconocido.");
  }
}

export async function POST(request: Request) {
  let body: OfflineSyncRequest;
  try {
    body = (await request.json()) as OfflineSyncRequest;
  } catch (error) {
    return NextResponse.json(
      { status: "error", error: "No pudimos leer el evento a sincronizar." },
      { status: 400 },
    );
  }

  const id = typeof body?.id === "string" ? body.id.trim() : "";
  const kind = body?.kind;
  const payload = body?.payload ?? {};

  if (!id || !kind || !VALID_KINDS.has(kind)) {
    return NextResponse.json(
      { status: "error", error: "Evento sin identificador o tipo válido." },
      { status: 400 },
    );
  }

  const sql = getSqlClient();
  await ensureOfflineLogTable(sql);

  const existing = normalizeRows<OfflineLogRow>(
    await sql`
      SELECT event_uuid, success, error_text
      FROM public.offline_event_log
      WHERE event_uuid = ${id}
      LIMIT 1
    `,
  );

  const previous = existing[0];
  const previousSuccess = previous
    ? normalizeBoolean(previous.success, false)
    : false;
  if (previous && previousSuccess) {
    return NextResponse.json({ status: "ok" });
  }

  try {
    if (typeof sql.begin === "function") {
      await sql.begin(async (transaction) => {
        await processEvent(transaction, kind, payload);
        await logEventResult(transaction, id, kind, true, null);
      });
    } else {
      await processEvent(sql, kind, payload);
      await logEventResult(sql, id, kind, true, null);
    }
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos sincronizar el evento solicitado.";

    await logEventResult(sql, id, kind, false, message);

    const statusCode = message.toLowerCase().includes("no encontramos") ? 409 : 500;

    return NextResponse.json({ status: "error", error: message }, { status: statusCode });
  }
}
