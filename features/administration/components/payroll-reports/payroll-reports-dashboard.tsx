"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  DaySession,
  MatrixCell,
  MatrixRow,
  PayrollMonthStatusRow,
  PayrollMatrixResponse,
} from "@/features/administration/data/payroll-reports";

type MatrixResponse = PayrollMatrixResponse;

type EditableSession = {
  sessionId: number | null;
  checkinTime: string | null;
  checkoutTime: string | null;
  originalCheckinTime: string | null;
  originalCheckoutTime: string | null;
};

type SelectedCell = {
  staffId: number;
  staffName: string;
  workDate: string;
  hours: number;
  approved: MatrixCell["approved"];
};

const STAFF_COLUMN_WIDTH = 220;
const PAID_COLUMN_WIDTH = 88;
const PAID_DATE_COLUMN_WIDTH = 160;
const TRAILING_COLUMNS_WIDTH = PAID_COLUMN_WIDTH + PAID_DATE_COLUMN_WIDTH;
const MIN_CELL_WIDTH = 24;
const GRID_PADDING = 32;

function getMonthRange(month: string): { from: string; to: string } {
  const [yearString, monthString] = month.split("-");
  const year = Number(yearString);
  const monthIndex = Number(monthString) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) {
    throw new Error("Mes inválido");
  }
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));
  const format = (date: Date) =>
    `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
      date.getUTCDate(),
    ).padStart(2, "0")}`;
  return { from: format(start), to: format(end) };
}

function formatDayLabel(dateString: string, formatter: Intl.DateTimeFormat) {
  const date = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return dateString;
  return formatter.format(date);
}

function toLocalInputValue(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function fromLocalInputValue(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function buildSessionEdits(sessions: DaySession[]): EditableSession[] {
  return sessions.map((session) => ({
    sessionId: session.sessionId,
    checkinTime: session.checkinTime,
    checkoutTime: session.checkoutTime,
    originalCheckinTime: session.checkinTime,
    originalCheckoutTime: session.checkoutTime,
  }));
}

type Props = {
  initialMonth: string;
};

export function PayrollReportsDashboard({ initialMonth }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [matrixData, setMatrixData] = useState<MatrixResponse | null>(null);
  const [monthStatusRows, setMonthStatusRows] = useState<PayrollMonthStatusRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessionEdits, setSessionEdits] = useState<EditableSession[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const matrixContainerRef = useRef<HTMLDivElement | null>(null);
  const [cellWidth, setCellWidth] = useState<number>(48);

  const hoursFormatter = useMemo(
    () =>
      new Intl.NumberFormat("es-EC", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [],
  );

  const dayHeaderFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-EC", {
        day: "2-digit",
        month: "short",
      }),
    [],
  );

  const weekdayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-EC", {
        weekday: "short",
      }),
    [],
  );

  const humanDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-EC", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "2-digit",
      }),
    [],
  );

  const paidDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-EC", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }),
    [],
  );

  const { from, to } = useMemo(() => getMonthRange(selectedMonth), [selectedMonth]);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [matrixResponse, monthStatusResponse] = await Promise.all([
        fetch(
          `/api/payroll/reports/matrix?month=${encodeURIComponent(selectedMonth)}`,
        ),
        fetch(
          `/api/payroll/reports/month-status?month=${encodeURIComponent(selectedMonth)}`,
        ),
      ]);

      if (!matrixResponse.ok) {
        const body = await matrixResponse.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Error al obtener la matriz.");
      }
      if (!monthStatusResponse.ok) {
        const body = await monthStatusResponse.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? "Error al obtener el estado del mes.",
        );
      }

      const matrixJson = (await matrixResponse.json()) as MatrixResponse;
      const monthStatusJson = (await monthStatusResponse.json()) as {
        rows?: PayrollMonthStatusRow[];
      };

      setMatrixData(matrixJson);
      setMonthStatusRows(monthStatusJson.rows ?? []);
    } catch (err) {
      console.error("No se pudo refrescar la información de nómina", err);
      const message = err instanceof Error ? err.message : "No pudimos cargar la información.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const openModal = useCallback(
    (row: MatrixRow, cell: MatrixCell) => {
      setSelectedCell({
        staffId: row.staffId,
        staffName: row.staffName ?? `Personal #${row.staffId}`,
        workDate: cell.date,
        hours: cell.hours,
        approved: cell.approved,
      });
      setSessionsLoading(true);
      setSessionsError(null);
      setSessionEdits([]);
      setActionError(null);
    },
    [],
  );

  const closeModal = useCallback(() => {
    setSelectedCell(null);
    setSessionsLoading(false);
    setSessionEdits([]);
    setSessionsError(null);
    setActionError(null);
    setActionLoading(false);
  }, []);

  useEffect(() => {
    if (!selectedCell) return;

    let cancelled = false;
    const { staffId, workDate } = selectedCell;

    async function loadSessions() {
      setSessionsLoading(true);
      setSessionsError(null);
      try {
        const response = await fetch(
          `/api/payroll/reports/day-sessions?staffId=${staffId}&date=${workDate}`,
        );
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? "No se pudieron cargar las sesiones.");
        }
        const data = (await response.json()) as { sessions?: DaySession[] };
        if (!cancelled) {
          setSessionEdits(buildSessionEdits(data.sessions ?? []));
        }
      } catch (err) {
        console.error("No se pudieron cargar las sesiones del día", err);
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "No se pudieron cargar las sesiones del día.";
          setSessionsError(message);
        }
      } finally {
        if (!cancelled) setSessionsLoading(false);
      }
    }

    void loadSessions();

    return () => {
      cancelled = true;
    };
  }, [selectedCell]);

  const onSessionChange = useCallback((index: number, field: "checkinTime" | "checkoutTime", value: string) => {
    setSessionEdits((previous) =>
      previous.map((session, idx) => {
        if (idx !== index) return session;
        const isoValue = fromLocalInputValue(value);
        return { ...session, [field]: isoValue };
      }),
    );
  }, []);

  const hasOverrides = useMemo(
    () =>
      sessionEdits.some(
        (session) =>
          session.checkinTime !== session.originalCheckinTime ||
          session.checkoutTime !== session.originalCheckoutTime,
      ),
    [sessionEdits],
  );

  const editableSessions = useMemo(
    () => sessionEdits.filter((session) => session.sessionId != null),
    [sessionEdits],
  );

  const recalculateCellWidth = useCallback((containerWidth: number, daysCount: number) => {
    if (!daysCount) return;
    const available =
      containerWidth - STAFF_COLUMN_WIDTH - TRAILING_COLUMNS_WIDTH - GRID_PADDING;
    const computed = available > 0 ? Math.floor(available / daysCount) : MIN_CELL_WIDTH;
    setCellWidth(Math.max(MIN_CELL_WIDTH, computed));
  }, []);

  const handleApprove = useCallback(async () => {
    if (!selectedCell) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const response = await fetch("/api/payroll/reports/approve-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: selectedCell.staffId,
          workDate: selectedCell.workDate,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((body as { error?: string }).error ?? "No pudimos aprobar el día.");
      }
      await refreshData();
      closeModal();
    } catch (err) {
      console.error("No se pudo aprobar el día", err);
      const message = err instanceof Error ? err.message : "No pudimos aprobar el día.";
      setActionError(message);
    } finally {
      setActionLoading(false);
    }
  }, [closeModal, refreshData, selectedCell]);

  const handleOverrideAndApprove = useCallback(async () => {
    if (!selectedCell || !hasOverrides || !editableSessions.length) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const overrides = editableSessions
        .map((session) => {
          if (!session.sessionId || !session.checkinTime || !session.checkoutTime) {
            return null;
          }
          return {
            sessionId: session.sessionId,
            checkinTime: session.checkinTime,
            checkoutTime: session.checkoutTime,
          };
        })
        .filter(
          (session): session is { sessionId: number; checkinTime: string; checkoutTime: string } =>
            Boolean(session),
        );

      if (!overrides.length) {
        throw new Error("No hay sesiones válidas para actualizar.");
      }

      const response = await fetch("/api/payroll/reports/override-and-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: selectedCell.staffId,
          workDate: selectedCell.workDate,
          overrides,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          (body as { error?: string }).error ?? "No pudimos sobrescribir y aprobar el día.",
        );
      }
      await refreshData();
      closeModal();
    } catch (err) {
      console.error("No se pudo sobrescribir y aprobar el día", err);
      const message =
        err instanceof Error ? err.message : "No pudimos sobrescribir y aprobar el día.";
      setActionError(message);
    } finally {
      setActionLoading(false);
    }
  }, [closeModal, editableSessions, hasOverrides, refreshData, selectedCell]);

  useEffect(() => {
    const element = matrixContainerRef.current;
    if (!element) return;

    const daysCount = matrixData?.days.length ?? 0;
    if (daysCount > 0) {
      recalculateCellWidth(element.getBoundingClientRect().width, daysCount);
    }

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (!width) continue;
        const days = matrixData?.days.length ?? 0;
        if (!days) continue;
        recalculateCellWidth(width, days);
      }
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [matrixData?.days.length, recalculateCellWidth]);

  const monthStatusByStaff = useMemo(() => {
    const map = new Map<number, PayrollMonthStatusRow>();
    for (const row of monthStatusRows) {
      map.set(row.staffId, row);
    }
    return map;
  }, [monthStatusRows]);

  const matrixDays = matrixData?.days ?? [];
  const effectiveCellWidth = Math.max(MIN_CELL_WIDTH, Math.floor(cellWidth));
  const compactCellText = effectiveCellWidth <= 28;
  const staffCount = matrixData?.rows.length ?? 0;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-20 h-72 w-72 -rotate-[18deg] rounded-[38px] bg-[#ffe6d2] opacity-70" />
        <div className="absolute right-0 top-6 h-60 w-60 rotate-[10deg] rounded-[34px] bg-[#dff8f2] opacity-80" />
        <div className="absolute bottom-0 left-1/2 h-[420px] w-[120%] -translate-x-1/2 rounded-t-[180px] bg-gradient-to-r from-[#ffeede] via-white to-[#c9f5ed]" />
      </div>

      <main className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-6 py-12 md:px-10 lg:px-14">
        <header className="flex flex-col gap-5 rounded-[28px] border border-white/70 bg-white/92 px-6 py-6 shadow-[0_20px_48px_rgba(15,23,42,0.12)] backdrop-blur">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-deep-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-deep">
            Control de nómina
          </span>
          <div className="flex flex-col gap-2 text-brand-deep">
            <h1 className="text-3xl font-black sm:text-4xl">Reportes de nómina</h1>
            <p className="max-w-3xl text-sm text-brand-ink-muted sm:text-base">
              Visualiza las horas trabajadas por el equipo, aprueba los días registrados y lleva un seguimiento de los pagos por mes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <label className="flex items-center gap-3 text-sm font-medium text-brand-deep">
              <span>Mes de trabajo</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => {
                  setSelectedMonth(event.target.value);
                }}
                className="rounded-full border border-brand-ink-muted/20 bg-white px-4 py-1.5 text-sm font-semibold text-brand-deep shadow focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
              />
            </label>
            <button
              type="button"
              onClick={() => void refreshData()}
              className="inline-flex items-center justify-center rounded-full border border-brand-teal-soft bg-brand-teal-soft/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:bg-brand-teal-soft/60 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
            >
              Refrescar datos
            </button>
          </div>
        </header>

        {error ? (
          <div className="rounded-[32px] border border-brand-orange bg-white/85 px-6 py-5 text-sm font-medium text-brand-ink">
            {error}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <section className="rounded-[32px] border border-white/70 bg-white/90 shadow-[0_18px_36px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="flex items-center justify-between gap-4 border-b border-brand-ink-muted/10 px-6 py-4">
                <div className="flex flex-col text-brand-deep">
                  <span className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-ink-muted">
                    Matriz de días
                  </span>
                  <p className="text-lg font-black">
                    {staffCount > 0 ? `${staffCount} integrantes` : "Sin personal registrado"}
                  </p>
                </div>
                <div className="text-right text-sm text-brand-ink-muted">
                  <p>
                    Rango: <span className="font-semibold text-brand-deep">{from}</span> a {" "}
                    <span className="font-semibold text-brand-deep">{to}</span>
                  </p>
                  <p>Actualizado automáticamente al aprobar días.</p>
                </div>
              </div>

              <div ref={matrixContainerRef} className="px-4 pb-6 pt-4">
                {isLoading ? (
                  <div className="flex h-40 items-center justify-center text-sm text-brand-ink-muted">
                    Cargando matriz…
                  </div>
                ) : !matrixData || !matrixData.rows.length ? (
                  <div className="flex h-40 items-center justify-center text-sm text-brand-ink-muted">
                    No encontramos registros de asistencia en el mes seleccionado.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-brand-deep">
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] text-orange-900">
                        <span className="h-2 w-2 rounded-full bg-orange-500" />
                        Pendiente
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-900">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Aprobado
                      </span>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-brand-ink-muted/10">
                      <table className="w-full table-fixed border-collapse text-[10px] leading-tight text-brand-deep">
                        <colgroup>
                          <col style={{ width: `${STAFF_COLUMN_WIDTH}px` }} />
                          {matrixDays.map((day) => (
                            <col key={`col-${day}`} style={{ width: `${effectiveCellWidth}px` }} />
                          ))}
                          <col style={{ width: `${PAID_COLUMN_WIDTH}px` }} />
                          <col style={{ width: `${PAID_DATE_COLUMN_WIDTH}px` }} />
                        </colgroup>
                        <thead>
                          <tr className="bg-brand-deep-soft/40 text-brand-ink">
                            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide">
                              Personal
                            </th>
                            {matrixDays.map((day) => (
                              <th
                                key={day}
                                className="px-1 py-2 text-center font-semibold uppercase text-brand-ink-muted"
                              >
                                <div className="flex flex-col items-center leading-tight text-brand-ink">
                                  <span className="text-[11px]">
                                    {formatDayLabel(day, dayHeaderFormatter)}
                                  </span>
                                  <span className="text-[9px] uppercase text-brand-ink-muted">
                                    {formatDayLabel(day, weekdayFormatter)}
                                  </span>
                                </div>
                              </th>
                            ))}
                            <th className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-brand-ink">
                              Pagado
                            </th>
                            <th className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-brand-ink">
                              Fecha de pago
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {matrixData.rows.map((row) => {
                            const monthStatus = monthStatusByStaff.get(row.staffId);
                            const paidLabel = monthStatus?.paid ? "Sí" : "No";
                            const paidAtIso = monthStatus?.paidAt ?? null;
                            const paidAtText =
                              paidAtIso && !Number.isNaN(Date.parse(paidAtIso))
                                ? paidDateFormatter.format(new Date(paidAtIso))
                                : "—";

                            return (
                              <tr key={row.staffId} className="odd:bg-white even:bg-brand-deep-soft/20">
                                <th className="px-3 py-2 text-left text-[11px] font-semibold text-brand-deep">
                                  <div className="flex flex-col gap-0.5 whitespace-nowrap">
                                    <span className={compactCellText ? "text-[10px]" : "text-xs"}>
                                      {row.staffName ?? `Personal #${row.staffId}`}
                                    </span>
                                    <span className="text-[9px] font-medium text-brand-ink-muted">
                                      ID: {row.staffId}
                                    </span>
                                  </div>
                                </th>
                                {row.cells.map((cell) => (
                                  <td key={cell.date} className="px-1 py-1 text-center">
                                    <button
                                      type="button"
                                      onClick={() => openModal(row, cell)}
                                      className={`inline-flex h-8 w-full items-center justify-center rounded-md border px-1 py-0.5 font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal-soft ${
                                        cell.approved
                                          ? "border-emerald-500 bg-emerald-500/80 text-white hover:bg-emerald-500"
                                          : "border-orange-500 bg-orange-500/85 text-white hover:bg-orange-500"
                                      } ${compactCellText ? "text-[9px]" : "text-[10px]"}`}
                                      style={{ minWidth: `${effectiveCellWidth}px` }}
                                    >
                                      <span className="whitespace-nowrap">
                                        {hoursFormatter.format(cell.hours)}
                                      </span>
                                    </button>
                                  </td>
                                ))}
                                <td className="px-2 py-1 text-center font-semibold text-brand-deep">
                                  {paidLabel}
                                </td>
                                <td className="px-2 py-1 text-center text-brand-ink-muted">
                                  {paidAtText}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </section>

          </div>
        )}
      </main>

      {selectedCell ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4 py-10 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl rounded-[32px] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-ink-muted/10 bg-white text-xl font-bold text-brand-ink transition hover:-translate-y-[1px] hover:bg-brand-teal-soft/40 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
              aria-label="Cerrar"
            >
              ×
            </button>
            <div className="flex flex-col gap-4 pr-10 text-brand-deep">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-ink-muted">
                  {selectedCell.approved ? "Día aprobado" : "Pendiente de aprobación"}
                </span>
                <h2 className="text-2xl font-black">{selectedCell.staffName}</h2>
                <p className="text-sm text-brand-ink-muted">
                  {humanDateFormatter.format(new Date(`${selectedCell.workDate}T00:00:00Z`))}
                </p>
              </div>
              <div className="rounded-[24px] border border-brand-ink-muted/10 bg-brand-deep-soft/30 px-5 py-4 text-sm text-brand-deep">
                Horas registradas: {hoursFormatter.format(selectedCell.hours)} h
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4">
              {sessionsLoading ? (
                <div className="flex h-32 items-center justify-center text-sm text-brand-ink-muted">
                  Cargando sesiones del día…
                </div>
              ) : sessionsError ? (
                <div className="rounded-3xl border border-brand-orange/70 bg-brand-orange/10 px-5 py-4 text-sm font-medium text-brand-ink">
                  {sessionsError}
                </div>
              ) : !sessionEdits.length ? (
                <div className="rounded-3xl border border-brand-ink-muted/20 bg-brand-deep-soft/40 px-5 py-4 text-sm text-brand-ink-muted">
                  No hay sesiones registradas para este día.
                </div>
              ) : (
                <div className="space-y-4">
                  {sessionEdits.map((session, index) => (
                    <div key={session.sessionId ?? index} className="rounded-3xl border border-brand-ink-muted/15 bg-white px-5 py-4 shadow-inner">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-semibold text-brand-deep">
                          Sesión #{index + 1}
                        </span>
                        {session.sessionId == null ? (
                          <span className="text-xs font-medium uppercase tracking-wide text-brand-orange">
                            Sin identificador
                          </span>
                        ) : null}
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="flex flex-col gap-1 text-sm text-brand-deep">
                          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-ink-muted">
                            Entrada
                          </span>
                          <input
                            type="datetime-local"
                            value={toLocalInputValue(session.checkinTime)}
                            onChange={(event) => onSessionChange(index, "checkinTime", event.target.value)}
                            className="rounded-2xl border border-brand-ink-muted/20 bg-white px-3 py-2 text-sm font-medium text-brand-deep shadow focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-sm text-brand-deep">
                          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-ink-muted">
                            Salida
                          </span>
                          <input
                            type="datetime-local"
                            value={toLocalInputValue(session.checkoutTime)}
                            onChange={(event) => onSessionChange(index, "checkoutTime", event.target.value)}
                            className="rounded-2xl border border-brand-ink-muted/20 bg-white px-3 py-2 text-sm font-medium text-brand-deep shadow focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {actionError ? (
              <div className="mt-4 rounded-3xl border border-brand-orange/70 bg-brand-orange/10 px-5 py-3 text-sm font-medium text-brand-ink">
                {actionError}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex items-center justify-center rounded-full border border-brand-ink-muted/20 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:bg-brand-deep-soft/50 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={actionLoading}
                className="inline-flex items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-500/90 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-emerald-500 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading ? "Procesando…" : "Aprobar día"}
              </button>
              <button
                type="button"
                onClick={handleOverrideAndApprove}
                disabled={actionLoading || !hasOverrides || !editableSessions.length}
                className="inline-flex items-center justify-center rounded-full border border-brand-ink-muted/20 bg-brand-orange px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-brand-orange/90 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-orange disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading ? "Procesando…" : "Sobrescribir y aprobar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
