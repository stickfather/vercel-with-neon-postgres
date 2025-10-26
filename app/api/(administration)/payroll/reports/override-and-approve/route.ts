import { NextResponse } from "next/server.js";
import { overrideSessionsAndApprove } from "@/features/administration/data/payroll-reports";
import { hasValidPinSession } from "@/lib/security/pin-session";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type OverridePayload = {
  sessionId?: number;
  checkinTime?: string;
  checkoutTime?: string;
};

type AdditionPayload = {
  checkinTime?: string;
  checkoutTime?: string;
};

export async function POST(request: Request) {
  const allowed = await hasValidPinSession("manager");
  if (!allowed) {
    return NextResponse.json(
      { error: "PIN de gerencia requerido." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch (error) {
    console.error("No se pudo leer el cuerpo de la solicitud", error);
    return NextResponse.json(
      { error: "No pudimos leer los datos enviados." },
      { status: 400 },
    );
  }

  const { staffId, workDate, overrides, additions, deletions, editorStaffId, note } = (payload ?? {}) as {
    staffId?: number;
    workDate?: string;
    overrides?: OverridePayload[];
    additions?: AdditionPayload[];
    deletions?: (number | string | null | undefined)[];
    editorStaffId?: number | string | null;
    note?: string | null;
  };

  if (!Number.isFinite(staffId) || !workDate) {
    return NextResponse.json(
      {
        error: "Debes indicar 'staffId' y 'workDate'.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const sanitizedOverrides = Array.isArray(overrides)
    ? overrides
        .map((entry) => ({
          sessionId: Number(entry.sessionId),
          checkinTime: typeof entry.checkinTime === "string" ? entry.checkinTime : null,
          checkoutTime: typeof entry.checkoutTime === "string" ? entry.checkoutTime : null,
        }))
        .filter(
          (entry): entry is { sessionId: number; checkinTime: string; checkoutTime: string } =>
            Number.isFinite(entry.sessionId) && entry.sessionId > 0 &&
            typeof entry.checkinTime === "string" &&
            typeof entry.checkoutTime === "string",
        )
    : [];

  const sanitizedAdditions = Array.isArray(additions)
    ? additions
        .map((entry) => ({
          checkinTime: typeof entry.checkinTime === "string" ? entry.checkinTime : null,
          checkoutTime: typeof entry.checkoutTime === "string" ? entry.checkoutTime : null,
        }))
        .filter(
          (entry): entry is { checkinTime: string; checkoutTime: string } =>
            typeof entry.checkinTime === "string" &&
            typeof entry.checkoutTime === "string",
        )
    : [];

  const sanitizedDeletions = Array.isArray(deletions)
    ? deletions
        .map((value) => {
          const parsed = Number(value);
          return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
        })
        .filter((value): value is number => value != null)
    : [];

  if (
    !sanitizedOverrides.length &&
    !sanitizedAdditions.length &&
    !sanitizedDeletions.length
  ) {
    return NextResponse.json(
      { error: "Debes enviar al menos una modificación válida." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    await overrideSessionsAndApprove({
      staffId: Number(staffId),
      workDate,
      overrides: sanitizedOverrides,
      additions: sanitizedAdditions,
      deletions: sanitizedDeletions,
      editorStaffId: (() => {
        if (typeof editorStaffId === "number" && Number.isFinite(editorStaffId)) {
          return Number(editorStaffId);
        }
        if (typeof editorStaffId === "string" && editorStaffId.trim().length) {
          const parsed = Number(editorStaffId);
          return Number.isFinite(parsed) ? parsed : null;
        }
        return null;
      })(),
      note: typeof note === "string" ? note : null,
    });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Error al modificar y aprobar el día", error);
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos modificar y aprobar el día.";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
