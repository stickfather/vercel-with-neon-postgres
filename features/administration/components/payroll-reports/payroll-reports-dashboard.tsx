"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  DaySession,
  DayApproval,
  MatrixCell,
  MatrixRow,
  PayrollMonthStatusRow,
  PayrollMatrixResponse,
  SessionEditDiff,
} from "@/features/administration/data/payroll-reports";
import { EphemeralToast } from "@/components/ui/ephemeral-toast";
import { PinPrompt } from "@/features/security/components/PinPrompt";

type MatrixResponse = PayrollMatrixResponse;

type SessionRow = {
  sessionKey: string;
  sessionId: number | null;
  staffId: number;
  workDate: string;
  checkinTime: string | null;
  checkoutTime: string | null;
  edits: SessionEditDiff[];
  isNew: boolean;
  isEditing: boolean;
  draftCheckin: string;
  draftCheckout: string;
  validationError: string | null;
  feedback: string | null;
  pendingAction: null | "edit" | "create" | "delete";
};

type SelectedCell = {
  staffId: number;
  staffName: string;
  workDate: string;
  rawHours: number;
  approvedHours: number | null;
  approved: MatrixCell["approved"];
  hasEdits: MatrixCell["hasEdits"];
};

type AccessMode = "pending" | "readOnly" | "management";

type ManagerAuthToken = {
  token: string;
  expiresAt: number | null;
};

const STAFF_COLUMN_WIDTH = 94;
const APPROVED_AMOUNT_COLUMN_WIDTH = 96;
const PAID_COLUMN_WIDTH = 72;
const PAID_DATE_COLUMN_WIDTH = 124;
const TRAILING_COLUMNS_WIDTH =
  APPROVED_AMOUNT_COLUMN_WIDTH + PAID_COLUMN_WIDTH + PAID_DATE_COLUMN_WIDTH;
const MIN_CELL_WIDTH = 32;
const PREFERRED_CELL_WIDTH = 68;
const GRID_PADDING = 16;
const PAYROLL_TIMEZONE = "America/Guayaquil";
const rowDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: PAYROLL_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeZoneDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: PAYROLL_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeZoneDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: PAYROLL_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const timeZoneOffsetFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: PAYROLL_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function getPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((part) => part.type === type)?.value ?? null;
}

function toTimeZoneDateString(date: Date): string | null {
  const parts = timeZoneDateFormatter.formatToParts(date);
  const year = getPart(parts, "year");
  const month = getPart(parts, "month");
  const day = getPart(parts, "day");
  if (!year || !month || !day) {
    return null;
  }
  return `${year}-${month}-${day}`;
}

function toTimeZoneDateTimeParts(
  date: Date,
): { year: string; month: string; day: string; hour: string; minute: string } | null {
  const parts = timeZoneDateTimeFormatter.formatToParts(date);
  const year = getPart(parts, "year");
  const month = getPart(parts, "month");
  const day = getPart(parts, "day");
  const hour = getPart(parts, "hour");
  const minute = getPart(parts, "minute");
  if (!year || !month || !day || !hour || !minute) {
    return null;
  }
  return { year, month, day, hour, minute } as const;
}

function getTimeZoneOffsetInMinutes(baseDate: Date): number {
  const parts = timeZoneOffsetFormatter.formatToParts(baseDate);
  const year = getPart(parts, "year");
  const month = getPart(parts, "month");
  const day = getPart(parts, "day");
  const hour = getPart(parts, "hour");
  const minute = getPart(parts, "minute");
  const second = getPart(parts, "second");
  if (!year || !month || !day || !hour || !minute || !second) {
    return 0;
  }
  const asUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  return (asUtc - baseDate.getTime()) / 60000;
}

function toMiddayUtc(dateString: string): Date | null {
  const trimmed = dateString.trim();
  if (!trimmed.length) {
    return null;
  }
  const isoDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!isoDateMatch) {
    return null;
  }
  const candidate = new Date(`${isoDateMatch[0]}T12:00:00Z`);
  if (Number.isNaN(candidate.getTime())) {
    return null;
  }
  return candidate;
}

type MonthSummaryRow = {
  staffId: number;
  staffName: string | null;
  month: string;
  approvedAmount: number | null;
  paid: boolean | null;
  amountPaid: number | null;
  paidAt: string | null;
  reference: string | null;
};

type RawMonthSummaryRow = {
  staff_id?: number;
  staffId?: number;
  staff_name?: string | null;
  staffName?: string | null;
  month?: string;
  approved_amount?: string | number | null;
  approvedAmount?: string | number | null;
  paid?: boolean | null;
  amount_paid?: string | number | null;
  amountPaid?: string | number | null;
  paid_at?: string | null;
  paidAt?: string | null;
  reference?: string | null;
};

type ApiMatrixRow = {
  staff_id: number;
  staff_name: string | null;
  work_date: string;
  total_hours: number;
  approved_hours: number | null;
  approved: boolean;
  has_edits: boolean;
  cell_color: "green" | "yellow" | "orange";
};

type ApiMatrixResponse = {
  range: { from: string; to: string };
  rows: ApiMatrixRow[];
  amounts_hidden?: boolean;
};

const currencyFormatter = new Intl.NumberFormat("es-EC", {
  style: "currency",
  currency: "USD",
});

function toCurrency(value: string | number | null | undefined): string {
  if (value == null) return "—";
  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric)) return "—";
  return currencyFormatter.format(numeric);
}

function toNumeric(value: unknown): number | null {
  if (value == null) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function createNoStoreInit(): RequestInit & { next: { revalidate: number } } {
  return {
    cache: "no-store",
    headers: { "Cache-Control": "no-store" },
    next: { revalidate: 0 },
  };
}

function enumerateDaysInclusive(from: string, to: string): string[] {
  const result: string[] = [];
  const fromMatch = from.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const toMatch = to.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!fromMatch || !toMatch) {
    return result;
  }

  let year = Number(fromMatch[1]);
  let month = Number(fromMatch[2]);
  let day = Number(fromMatch[3]);

  const toYear = Number(toMatch[1]);
  const toMonth = Number(toMatch[2]);
  const toDay = Number(toMatch[3]);

  while (true) {
    const value = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    result.push(value);
    if (year === toYear && month === toMonth && day === toDay) {
      break;
    }
    day += 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day > daysInMonth) {
      day = 1;
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
  }

  return result;
}

function sanitizeHoursValue(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Number(value.toFixed(2));
}

function sanitizeOptionalHoursValue(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return Number(value.toFixed(2));
}

function getMonthRange(month: string): { from: string; to: string; endExclusive: string } {
  const [yearString, monthString] = month.split("-");
  const year = Number(yearString);
  const monthNumber = Number(monthString);

  if (!Number.isFinite(year) || !Number.isFinite(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    throw new Error("Mes inválido");
  }

  const monthStart = `${year}-${String(monthNumber).padStart(2, "0")}-01`;
  const nextMonthNumber = monthNumber === 12 ? 1 : monthNumber + 1;
  const nextMonthYear = monthNumber === 12 ? year + 1 : year;
  const nextMonthStart = `${nextMonthYear}-${String(nextMonthNumber).padStart(2, "0")}-01`;

  const startDate = new Date(`${monthStart}T00:00:00Z`);
  const nextMonthDate = new Date(`${nextMonthStart}T00:00:00Z`);
  const displayEndDate = new Date(nextMonthDate.getTime() - 24 * 60 * 60 * 1000);

  const format = (date: Date) =>
    `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
      date.getUTCDate(),
    ).padStart(2, "0")}`;

  return { from: monthStart, to: format(displayEndDate), endExclusive: nextMonthStart };
}

function formatDayLabel(dateString: string, formatter: Intl.DateTimeFormat) {
  const midday = toMiddayUtc(dateString);
  if (!midday) {
    return dateString;
  }
  return formatter.format(midday);
}

function toLocalInputValue(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = toTimeZoneDateTimeParts(date);
  if (!parts) {
    return "";
  }
  const { year, month, day, hour, minute } = parts;
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function fromLocalInputValue(value: string): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }
  const [, yearStr, monthStr, dayStr, hourStr, minuteStr] = match;
  const baseUtcMs = Date.UTC(
    Number(yearStr),
    Number(monthStr) - 1,
    Number(dayStr),
    Number(hourStr),
    Number(minuteStr),
    0,
    0,
  );
  if (!Number.isFinite(baseUtcMs)) {
    return null;
  }
  const baseDate = new Date(baseUtcMs);
  const offsetMinutes = getTimeZoneOffsetInMinutes(baseDate);
  const adjustedMs = baseUtcMs - offsetMinutes * 60000;
  const adjustedDate = new Date(adjustedMs);
  if (Number.isNaN(adjustedDate.getTime())) {
    return null;
  }
  return adjustedDate.toISOString();
}

function toIsoDateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.length) {
    return null;
  }

  const isoCandidate = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoCandidate) {
    const year = isoCandidate[1];
    const month = isoCandidate[2];
    const day = isoCandidate[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const zoned = toTimeZoneDateString(parsed);
  return zoned;
}

function generateSessionKey(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    try {
      return `${prefix}-${crypto.randomUUID()}`;
    } catch (error) {
      // Ignore failures and fallback to Math.random
    }
  }
  return `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

function buildSessionRows(sessions: DaySession[]): SessionRow[] {
  return sessions.map((session, index) => ({
    sessionKey:
      session.sessionId != null
        ? `existing-${session.sessionId}`
        : generateSessionKey(`session-${index}`),
    sessionId: session.sessionId,
    staffId: session.staffId,
    workDate: session.workDate,
    checkinTime: session.checkinTime,
    checkoutTime: session.checkoutTime,
    edits: Array.isArray(session.edits) ? [...session.edits] : [],
    isNew: false,
    isEditing: false,
    draftCheckin: toLocalInputValue(session.checkinTime),
    draftCheckout: toLocalInputValue(session.checkoutTime),
    validationError: null,
    feedback: null,
    pendingAction: null,
  }));
}

function createEmptySessionRow(staffId: number, workDate: string): SessionRow {
  return {
    sessionKey: generateSessionKey("new-session"),
    sessionId: null,
    staffId,
    workDate,
    checkinTime: null,
    checkoutTime: null,
    edits: [],
    isNew: true,
    isEditing: true,
    draftCheckin: "",
    draftCheckout: "",
    validationError: null,
    feedback: null,
    pendingAction: null,
  };
}

function getActiveRowTimes(row: SessionRow): {
  checkinIso: string | null;
  checkoutIso: string | null;
} {
  if (row.isEditing) {
    return {
      checkinIso: fromLocalInputValue(row.draftCheckin),
      checkoutIso: fromLocalInputValue(row.draftCheckout),
    };
  }
  return { checkinIso: row.checkinTime, checkoutIso: row.checkoutTime };
}

function computeRowMinutes(row: SessionRow): number | null {
  const { checkinIso, checkoutIso } = getActiveRowTimes(row);
  if (!checkinIso || !checkoutIso) return null;
  const start = new Date(checkinIso).getTime();
  const end = new Date(checkoutIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }
  return Math.round((end - start) / 60000);
}

function sortSessionRows(rows: SessionRow[]): SessionRow[] {
  return [...rows].sort((a, b) => {
    const aTimes = getActiveRowTimes(a);
    const bTimes = getActiveRowTimes(b);
    if (!aTimes.checkinIso && !bTimes.checkinIso) return 0;
    if (!aTimes.checkinIso) return 1;
    if (!bTimes.checkinIso) return -1;
    return new Date(aTimes.checkinIso).getTime() - new Date(bTimes.checkinIso).getTime();
  });
}

function validateRowDraft(
  row: SessionRow,
  rows: SessionRow[],
  workDate: string,
): string | null {
  const { checkinIso, checkoutIso } = getActiveRowTimes(row);
  if (!checkinIso || !checkoutIso) {
    return "Completa las horas de entrada y salida.";
  }

  const checkinDate = new Date(checkinIso);
  const checkoutDate = new Date(checkoutIso);
  if (Number.isNaN(checkinDate.getTime()) || Number.isNaN(checkoutDate.getTime())) {
    return "Ingresa horas válidas.";
  }
  if (checkoutDate.getTime() <= checkinDate.getTime()) {
    return "La salida debe ser posterior a la entrada.";
  }

  const checkinDay = rowDayFormatter.format(checkinDate);
  const checkoutDay = rowDayFormatter.format(checkoutDate);
  if (checkinDay !== workDate || checkoutDay !== workDate) {
    return "La sesión debe corresponder al día seleccionado.";
  }

  for (const candidate of rows) {
    if (candidate.sessionKey === row.sessionKey) continue;
    const { checkinIso: otherStart, checkoutIso: otherEnd } = getActiveRowTimes(candidate);
    if (!otherStart || !otherEnd) continue;
    const startMs = checkinDate.getTime();
    const endMs = checkoutDate.getTime();
    const otherStartMs = new Date(otherStart).getTime();
    const otherEndMs = new Date(otherEnd).getTime();
    if (!Number.isFinite(otherStartMs) || !Number.isFinite(otherEndMs)) {
      continue;
    }
    if (endMs > otherStartMs && startMs < otherEndMs) {
      return "Los horarios se superponen con otra sesión.";
    }
  }

  return null;
}

type Props = {
  initialMonth: string;
};

export function PayrollReportsDashboard({ initialMonth }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [matrixData, setMatrixData] = useState<MatrixResponse | null>(null);
  const [monthStatusRows, setMonthStatusRows] = useState<PayrollMonthStatusRow[]>([]);
  const [monthSummaryRows, setMonthSummaryRows] = useState<MonthSummaryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paidAtDrafts, setPaidAtDrafts] = useState<Record<number, string>>({});
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const [accessMode, setAccessMode] = useState<AccessMode>("pending");
  const [pendingAccessMode, setPendingAccessMode] = useState<AccessMode | null>(null);
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessionRows, setSessionRows] = useState<SessionRow[]>([]);
  const [dayApproval, setDayApproval] = useState<DayApproval | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(
    null,
  );
  const [managerToken, setManagerToken] = useState<ManagerAuthToken | null>(null);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [amountPopoverStaffId, setAmountPopoverStaffId] = useState<number | null>(null);
  const pinRequestRef = useRef<((value: ManagerAuthToken | null) => void) | null>(null);
  const sessionRowsRef = useRef<SessionRow[]>([]);

  const isManagementMode = accessMode === "management";
  const isReadOnlyMode = accessMode === "readOnly";

  const resolvePinRequest = useCallback(
    (token: ManagerAuthToken | null) => {
      const resolver = pinRequestRef.current;
      pinRequestRef.current = null;
      if (token && pendingAccessMode === "management") {
        setAccessMode("management");
      }
      if (!token && pendingAccessMode === "management") {
        setAccessMode("pending");
      }
      setPendingAccessMode(null);
      if (resolver) {
        resolver(token);
      }
    },
    [pendingAccessMode],
  );

  const waitForPin = useCallback((): Promise<ManagerAuthToken | null> => {
    return new Promise((resolve) => {
      pinRequestRef.current = resolve;
      setPinModalOpen(true);
    });
  }, []);

  const isTokenValid = useCallback((token: ManagerAuthToken | null): token is ManagerAuthToken => {
    if (!token) return false;
    if (token.expiresAt == null) return true;
    return token.expiresAt > Date.now();
  }, []);

  const ensureManagementAccess = useCallback(async (): Promise<ManagerAuthToken | null> => {
    if (!isManagementMode) {
      setToast({ message: "Disponible sólo en modo gestión.", tone: "error" });
      return null;
    }
    if (isTokenValid(managerToken)) {
      return managerToken;
    }
    const token = await waitForPin();
    if (token) {
      setManagerToken(token);
    }
    return token;
  }, [isManagementMode, isTokenValid, managerToken, waitForPin, setToast]);

  const handleUnauthorized = useCallback(async (): Promise<ManagerAuthToken | null> => {
    if (!isManagementMode) {
      return null;
    }
    setManagerToken(null);
    const token = await waitForPin();
    if (token) {
      setManagerToken(token);
    }
    return token;
  }, [isManagementMode, waitForPin]);

  const performProtectedFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const token = await ensureManagementAccess();
      if (!token) {
        throw new Error("PIN de gerencia requerido.");
      }

      const headers = new Headers(init?.headers ?? {});
      headers.set("Authorization", `Bearer ${token.token}`);

      let response = await fetch(input, { ...init, headers });
      if (response.status === 401) {
        const refreshed = await handleUnauthorized();
        if (!refreshed) {
          throw new Error("PIN de gerencia requerido.");
        }
        const retryHeaders = new Headers(init?.headers ?? {});
        retryHeaders.set("Authorization", `Bearer ${refreshed.token}`);
        response = await fetch(input, { ...init, headers: retryHeaders });
        if (response.status === 401) {
          setManagerToken(null);
          throw new Error("PIN de gerencia requerido.");
        }
        setManagerToken(refreshed);
      } else {
        setManagerToken(token);
      }

      return response;
    },
    [ensureManagementAccess, handleUnauthorized],
  );

  const fetchWithAccess = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      if (isManagementMode) {
        return performProtectedFetch(input, init);
      }
      return fetch(input, init);
    },
    [isManagementMode, performProtectedFetch],
  );

  const [staffNames, setStaffNames] = useState<Record<number, string>>({});
  const [monthStatusSaving, setMonthStatusSaving] = useState<Record<number, boolean>>({});
  const [monthStatusErrors, setMonthStatusErrors] = useState<Record<number, string | null>>({});

  useEffect(() => {
    setPaidAtDrafts((previous) => {
      const next: Record<number, string> = {};
      monthStatusRows.forEach((row) => {
        const isoValue = toIsoDateOnly(row.paidAt);
        next[row.staffId] = isoValue ?? "";
      });

      const previousEntries = Object.entries(previous);
      const nextEntries = Object.entries(next);

      if (previousEntries.length === nextEntries.length) {
        const allEqual = nextEntries.every(([key, value]) => {
          const prevValue = (previous as Record<string, string>)[key] ?? "";
          return prevValue === value;
        });
        if (allEqual) {
          return previous;
        }
      }

      return next;
    });
  }, [monthStatusRows]);

  const summaryStaffNames = useMemo(() => {
    const map: Record<number, string> = {};
    for (const row of monthSummaryRows) {
      if (row.staffName) {
        map[row.staffId] = row.staffName;
      }
    }
    return map;
  }, [monthSummaryRows]);

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
        timeZone: PAYROLL_TIMEZONE,
      }),
    [],
  );

  const weekdayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-EC", {
        weekday: "short",
        timeZone: PAYROLL_TIMEZONE,
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
        timeZone: PAYROLL_TIMEZONE,
      }),
    [],
  );

  const paidDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-EC", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        timeZone: PAYROLL_TIMEZONE,
      }),
    [],
  );

  const approvalTimestampFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-EC", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: PAYROLL_TIMEZONE,
      }),
    [],
  );

  const sessionTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-EC", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: PAYROLL_TIMEZONE,
      }),
    [],
  );

  const formatSessionTimeLabel = useCallback(
    (value: string | null): string => {
      if (!value) return "—";
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        return "—";
      }
      return sessionTimeFormatter.format(parsed);
    },
    [sessionTimeFormatter],
  );

  const formatEditRange = useCallback(
    (checkin: string | null, checkout: string | null, minutes: number | null): string => {
      const startLabel = formatSessionTimeLabel(checkin);
      const endLabel = formatSessionTimeLabel(checkout);
      const durationLabel =
        minutes != null && Number.isFinite(minutes)
          ? `${hoursFormatter.format(minutes / 60)} h`
          : "—";
      return `${startLabel} – ${endLabel} (${durationLabel})`;
    },
    [formatSessionTimeLabel, hoursFormatter],
  );

  const formatTimestamp = useCallback(
    (value: string | null): string | null => {
      if (!value) return null;
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        return null;
      }
      return approvalTimestampFormatter.format(parsed);
    },
    [approvalTimestampFormatter],
  );

  const resolveStaffName = useCallback(
    (row: { staffId: number; staffName?: string | null }) =>
      row.staffName
      ?? summaryStaffNames[row.staffId]
      ?? staffNames[row.staffId]
      ?? `Personal #${row.staffId}`,
    [staffNames, summaryStaffNames],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadStaffDirectory() {
      try {
        const response = await fetch("/api/staff-members", createNoStoreInit());
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          const message = (body as { error?: string }).error ?? "No pudimos cargar el personal.";
          throw new Error(message);
        }
        const staff = (await response.json()) as { id: number; fullName: string }[];
        if (cancelled) return;
        const map: Record<number, string> = {};
        for (const entry of staff) {
          if (typeof entry.id === "number" && entry.id > 0 && typeof entry.fullName === "string") {
            map[entry.id] = entry.fullName;
          }
        }
        setStaffNames(map);
      } catch (error) {
        console.error("No se pudieron cargar los nombres del personal", error);
      }
    }

    void loadStaffDirectory();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedCell) return;
    const resolvedName = staffNames[selectedCell.staffId];
    if (!resolvedName || resolvedName === selectedCell.staffName) return;
    setSelectedCell((previous) => {
      if (!previous || previous.staffId !== selectedCell.staffId) return previous;
      return { ...previous, staffName: resolvedName };
    });
  }, [selectedCell, staffNames]);

  const monthRange = useMemo(() => {
    try {
      return getMonthRange(selectedMonth);
    } catch (error) {
      console.error("Mes inválido seleccionado", error);
      return { from: selectedMonth, to: selectedMonth, endExclusive: selectedMonth };
    }
  }, [fetchWithAccess, selectedMonth]);

  const { from, to } = monthRange;

  const activeRange = useMemo(() => {
    const trimmedStart = customStartDate.trim();
    const trimmedEnd = customEndDate.trim();

    const startIso = trimmedStart.length ? toIsoDateOnly(trimmedStart) : null;
    const endIso = trimmedEnd.length ? toIsoDateOnly(trimmedEnd) : null;

    if (trimmedStart.length && !startIso) {
      return {
        start: from,
        end: to,
        usingCustom: false as const,
        error: "La fecha inicial es inválida.",
        hint: null,
      };
    }

    if (trimmedEnd.length && !endIso) {
      return {
        start: from,
        end: to,
        usingCustom: false as const,
        error: "La fecha final es inválida.",
        hint: null,
      };
    }

    if (startIso && !endIso) {
      return {
        start: from,
        end: to,
        usingCustom: false as const,
        error: null,
        hint: "Ingresa también la fecha final para activar el rango manual.",
      };
    }

    if (!startIso && endIso) {
      return {
        start: from,
        end: to,
        usingCustom: false as const,
        error: null,
        hint: "Ingresa también la fecha inicial para activar el rango manual.",
      };
    }

    if (startIso && endIso) {
      if (startIso > endIso) {
        return {
          start: from,
          end: to,
          usingCustom: false as const,
          error: "La fecha inicial debe ser anterior o igual a la final.",
          hint: null,
        };
      }
      return {
        start: startIso,
        end: endIso,
        usingCustom: true as const,
        error: null,
        hint: "Mostrando rango personalizado.",
      };
    }

    return {
      start: from,
      end: to,
      usingCustom: false as const,
      error: null,
      hint: null,
    };
  }, [customEndDate, customStartDate, from, to]);

  const activeStart = activeRange.start;
  const activeEnd = activeRange.end;
  const usingCustomRange = activeRange.usingCustom;
  const rangeError = activeRange.error;
  const rangeHint = activeRange.hint;
  const rangeStatusText =
    rangeError
      ?? rangeHint
      ?? (usingCustomRange
        ? "Mostrando sólo los días dentro del rango personalizado."
        : "El mes seleccionado define el rango cuando no hay fechas manuales.");

  const fetchMatrixData = useCallback(async (): Promise<MatrixResponse> => {
    if (!activeStart || !activeEnd) {
      throw new Error("Debes indicar el rango de fechas.");
    }

    const params = new URLSearchParams();
    params.set("from", activeStart);
    params.set("to", activeEnd);

    const url = `/api/payroll/matrix?${params.toString()}`;
    const response = await fetchWithAccess(url, createNoStoreInit());
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        (body as { error?: string } | null)?.error ?? "Error al obtener la matriz.";
      throw new Error(message);
    }

    const apiMatrix = body as ApiMatrixResponse | null;
    if (!apiMatrix || !apiMatrix.range) {
      return { days: [], rows: [], amountsHidden: true };
    }

    const days = enumerateDaysInclusive(apiMatrix.range.from, apiMatrix.range.to);

    const grouped = new Map<
      number,
      {
        staffId: number;
        staffName?: string | null;
        cells: Map<string, MatrixCell>;
      }
    >();

    for (const entry of apiMatrix.rows ?? []) {
      const staffId = Number(entry.staff_id);
      if (!Number.isFinite(staffId)) {
        continue;
      }
      const workDate = typeof entry.work_date === "string" ? entry.work_date : "";
      if (!workDate) {
        continue;
      }

      if (!grouped.has(staffId)) {
        grouped.set(staffId, {
          staffId,
          staffName: entry.staff_name ?? undefined,
          cells: new Map(),
        });
      }

      const rawHours = sanitizeHoursValue(entry.total_hours);
      const approvedHours = sanitizeOptionalHoursValue(entry.approved_hours);

      grouped.get(staffId)!.cells.set(workDate, {
        date: workDate,
        rawHours,
        approved: Boolean(entry.approved),
        approvedHours: approvedHours,
        hasEdits: Boolean(entry.has_edits),
      });
    }

    const matrixRows: MatrixRow[] = [];

    for (const [, value] of grouped) {
      const cells: MatrixCell[] = days.map((day) => {
        const existing = value.cells.get(day);
        if (existing) {
          return existing;
        }
        return {
          date: day,
          rawHours: 0,
          approved: false,
          approvedHours: null,
          hasEdits: false,
        };
      });

      matrixRows.push({
        staffId: value.staffId,
        staffName: value.staffName ?? undefined,
        cells,
      });
    }

    matrixRows.sort((a, b) => a.staffId - b.staffId);

    return { days, rows: matrixRows, amountsHidden: Boolean(apiMatrix.amounts_hidden) };
  }, [activeEnd, activeStart, fetchWithAccess]);

  const fetchMonthStatusData = useCallback(
    async (staffId?: number): Promise<PayrollMonthStatusRow[]> => {
      const staffQuery =
        staffId != null ? `&staffId=${encodeURIComponent(String(staffId))}` : "";
      const response = await fetchWithAccess(
        `/api/payroll/month-status?month=${encodeURIComponent(selectedMonth)}${staffQuery}`,
        createNoStoreInit(),
      );
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          (body as { error?: string } | null)?.error ?? "Error al obtener el estado del mes.";
        throw new Error(message);
      }

      const rows = (body as { rows?: PayrollMonthStatusRow[] } | null)?.rows ?? [];
      return [...rows].sort((a, b) => a.staffId - b.staffId);
    },
    [fetchWithAccess, selectedMonth],
  );

  const fetchMonthSummaryData = useCallback(async (): Promise<MonthSummaryRow[]> => {
    const response = await fetchWithAccess(
      `/api/payroll/month-summary?month=${encodeURIComponent(selectedMonth)}`,
      createNoStoreInit(),
    );
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        (body as { error?: string } | null)?.error
        ?? "Error al obtener el resumen mensual.";
      throw new Error(message);
    }

    const rows = (body as { rows?: RawMonthSummaryRow[] } | null)?.rows ?? [];

    return rows
      .map((row) => {
        const staffIdRaw = row.staff_id ?? row.staffId;
        const staffId = Number(staffIdRaw);
        if (!Number.isFinite(staffId) || staffId <= 0) {
          return null;
        }

        const staffNameValue =
          typeof row.staff_name === "string"
            ? row.staff_name
            : typeof row.staffName === "string"
              ? row.staffName
              : null;

        const monthValue =
          typeof row.month === "string" && row.month.length
            ? row.month
            : `${selectedMonth}-01`;

        const approvedAmountValue = row.approved_amount ?? row.approvedAmount ?? null;
        const amountPaidValue = row.amount_paid ?? row.amountPaid ?? null;
        const paidAtValue = row.paid_at ?? row.paidAt ?? null;

        const referenceValue =
          typeof row.reference === "string" && row.reference.trim().length
            ? row.reference.trim()
            : null;

        const paidValue =
          typeof row.paid === "boolean"
            ? row.paid
            : row.paid != null
              ? Boolean(row.paid)
              : null;

        return {
          staffId,
          staffName: staffNameValue,
          month: monthValue,
          approvedAmount: toNumeric(approvedAmountValue),
          paid: paidValue,
          amountPaid: toNumeric(amountPaidValue),
          paidAt:
            typeof paidAtValue === "string" && paidAtValue.trim().length > 0
              ? paidAtValue
              : null,
          reference: referenceValue,
        } satisfies MonthSummaryRow;
      })
      .filter((row): row is MonthSummaryRow => row != null)
      .sort((a, b) => a.staffId - b.staffId);
  }, [selectedMonth]);

  const refreshData = useCallback(async () => {
    if (rangeError) {
      setError(rangeError);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    setMonthStatusErrors({});
    setMonthStatusSaving({});
    try {
      const [matrixJson, monthStatusList, monthSummaryList] = await Promise.all([
        fetchMatrixData(),
        fetchMonthStatusData(),
        fetchMonthSummaryData(),
      ]);
      setMatrixData(matrixJson);
      setMonthStatusRows(monthStatusList);
      setMonthSummaryRows(monthSummaryList);
    } catch (err) {
      console.error("No se pudo refrescar la información de nómina", err);
      const message = err instanceof Error ? err.message : "No pudimos cargar la información.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [
    fetchMatrixData,
    fetchMonthStatusData,
    fetchMonthSummaryData,
    rangeError,
  ]);

  const refreshMatrixOnly = useCallback(async () => {
    const matrixJson = await fetchMatrixData();
    setMatrixData(matrixJson);
  }, [fetchMatrixData]);

  const refreshMonthStatusForStaff = useCallback(
    async (staffId: number) => {
      const rows = await fetchMonthStatusData(staffId);
      setMonthStatusRows((previous) => {
        const withoutStaff = previous.filter((row) => row.staffId !== staffId);
        const merged = [...withoutStaff, ...rows];
        merged.sort((a, b) => a.staffId - b.staffId);
        return merged;
      });
    },
    [fetchMonthStatusData],
  );

  const refreshMonthSummary = useCallback(async () => {
    const rows = await fetchMonthSummaryData();
    setMonthSummaryRows(rows);
  }, [fetchMonthSummaryData]);

  const updateMonthStatus = useCallback(
    async (
      staffId: number,
      currentRow: PayrollMonthStatusRow | undefined,
      updates: { paid?: boolean; paidAt?: string | null },
    ) => {
      const monthValue = currentRow?.month ?? `${selectedMonth}-01`;
      const nextPaid = updates.paid ?? currentRow?.paid ?? false;
      const currentPaidAtInput = currentRow?.paidAt
        ? toIsoDateOnly(currentRow.paidAt)
        : null;
      const nextPaidAtInput =
        updates.paidAt !== undefined ? updates.paidAt : currentPaidAtInput;

      setMonthStatusSaving((previous) => ({ ...previous, [staffId]: true }));
      setMonthStatusErrors((previous) => ({ ...previous, [staffId]: null }));

      try {
        const amountPaidValue =
          typeof currentRow?.amountPaid === "number" && Number.isFinite(currentRow.amountPaid)
            ? currentRow.amountPaid
            : null;
        const referenceValue =
          typeof currentRow?.reference === "string" && currentRow.reference.trim().length
            ? currentRow.reference.trim()
            : null;
        const response = await performProtectedFetch("/api/payroll/month-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staffId,
            month: monthValue,
            paid: nextPaid,
            paidAt: nextPaid ? nextPaidAtInput : null,
            amountPaid: nextPaid ? amountPaidValue : null,
            reference: nextPaid ? referenceValue : null,
          }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            (body as { error?: string }).error
              ?? "No pudimos actualizar el estado del mes.",
          );
        }

        await refreshMonthStatusForStaff(staffId);
        setMonthStatusErrors((previous) => ({ ...previous, [staffId]: null }));
      } catch (error) {
        console.error("No se pudo actualizar el estado mensual", error);
        const message =
          error instanceof Error
            ? error.message
            : "No pudimos actualizar el estado del mes.";
        setMonthStatusErrors((previous) => ({ ...previous, [staffId]: message }));
      } finally {
        setMonthStatusSaving((previous) => {
          const next = { ...previous };
          delete next[staffId];
          return next;
        });
      }
    },
    [performProtectedFetch, refreshMonthStatusForStaff, selectedMonth],
  );

  useEffect(() => {
    if (accessMode === "pending") {
      return;
    }
    void refreshData();
  }, [accessMode, refreshData]);

  const openModal = useCallback(
    (row: MatrixRow, cell: MatrixCell) => {
      setSelectedCell({
        staffId: row.staffId,
        staffName: resolveStaffName(row),
        workDate: cell.date,
        rawHours: cell.rawHours,
        approvedHours: cell.approvedHours,
        approved: cell.approved,
        hasEdits: cell.hasEdits,
      });
      setSessionsLoading(true);
      setSessionsError(null);
      setSessionRows([]);
      setActionError(null);
    },
    [resolveStaffName],
  );

  const closeModal = useCallback(() => {
    setSelectedCell(null);
    setSessionsLoading(false);
    setSessionRows([]);
    setSessionsError(null);
    setActionError(null);
    setActionLoading(false);
    setPinModalOpen(false);
    resolvePinRequest(null);
    setDayApproval(null);
  }, [resolvePinRequest]);

  useEffect(() => {
    if (!selectedCell) return;

    let cancelled = false;
    const { staffId, workDate } = selectedCell;

    async function loadSessions() {
      setSessionsLoading(true);
      setSessionsError(null);
      try {
        const response = await fetch(
          `/api/payroll/day-detail?staffId=${staffId}&date=${workDate}`,
          createNoStoreInit(),
        );
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? "No se pudieron cargar las sesiones.");
        }
        const data = (await response.json()) as { sessions?: DaySession[]; approval?: DayApproval | null };
        if (!cancelled) {
          const sessions = data.sessions ?? [];
          setSessionRows(sortSessionRows(buildSessionRows(sessions)));
          setDayApproval(data.approval ?? null);
          const totalMinutesFromSessions = sessions.reduce((accumulator, session) => {
            const checkinTime = session.checkinTime ? new Date(session.checkinTime).getTime() : NaN;
            const checkoutTime = session.checkoutTime ? new Date(session.checkoutTime).getTime() : NaN;
            if (
              !Number.isFinite(checkinTime) ||
              !Number.isFinite(checkoutTime) ||
              checkoutTime <= checkinTime
            ) {
              return accumulator;
            }
            return accumulator + Math.round((checkoutTime - checkinTime) / 60000);
          }, 0);
          const approvedMinutes =
            typeof data.approval?.approvedMinutes === "number"
              ? Math.max(0, data.approval.approvedMinutes)
              : null;
          const derivedRawHours = Number((totalMinutesFromSessions / 60).toFixed(2));
          const derivedApprovedHours =
            approvedMinutes != null ? Number((approvedMinutes / 60).toFixed(2)) : null;
          setSelectedCell((previous) => {
            if (!previous) return previous;
            if (previous.staffId !== staffId || previous.workDate !== workDate) {
              return previous;
            }
            return {
              ...previous,
              rawHours: derivedRawHours,
              approvedHours: derivedApprovedHours,
              approved:
                typeof data.approval?.approved === "boolean"
                  ? data.approval.approved
                  : previous.approved,
            };
          });
        }
        } catch (err) {
          console.error("No se pudieron cargar las sesiones del día", err);
          if (!cancelled) {
            const message =
              err instanceof Error ? err.message : "No se pudieron cargar las sesiones del día.";
            setSessionsError(message);
            setDayApproval(null);
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

  const handleDraftChange = useCallback(
    (sessionKey: string, field: "checkin" | "checkout", value: string) => {
      setSessionRows((previous) => {
        const updated = previous.map((row) => {
          if (row.sessionKey !== sessionKey) return row;
          return {
            ...row,
            draftCheckin: field === "checkin" ? value : row.draftCheckin,
            draftCheckout: field === "checkout" ? value : row.draftCheckout,
            feedback: null,
          };
        });

        return updated.map((row) => {
          if (row.sessionKey !== sessionKey) return row;
          return {
            ...row,
            validationError: validateRowDraft(row, updated, row.workDate),
          };
        });
      });
    },
    [],
  );

  const addBlankSession = useCallback(async () => {
    if (!selectedCell) return;
    const allowed = await ensureManagementAccess();
    if (!allowed) {
      return;
    }
    setSessionRows((previous) =>
      sortSessionRows([
        ...previous,
        createEmptySessionRow(selectedCell.staffId, selectedCell.workDate),
      ]),
    );
  }, [ensureManagementAccess, selectedCell]);

  const enableRowEditing = useCallback(
    async (sessionKey: string) => {
      const allowed = await ensureManagementAccess();
      if (!allowed) return;
      setSessionRows((previous) => {
        const updated = previous.map((row) => {
          if (row.sessionKey !== sessionKey) return row;
          const draftCheckin = toLocalInputValue(row.checkinTime);
          const draftCheckout = toLocalInputValue(row.checkoutTime);
          const candidate = {
            ...row,
            isEditing: true,
            draftCheckin,
            draftCheckout,
            feedback: null,
          };
          return {
            ...candidate,
            validationError: validateRowDraft(candidate, previous, row.workDate),
          };
        });
        return sortSessionRows(updated);
      });
    },
    [ensureManagementAccess],
  );

  const saveRowChanges = useCallback(
    async (sessionKey: string) => {
      if (!selectedCell) return;
      const rows = sessionRowsRef.current;
      const target = rows.find((row) => row.sessionKey === sessionKey);
      if (!target) return;

      const validation = validateRowDraft(target, rows, target.workDate);
      if (validation) {
        setSessionRows((previous) =>
          previous.map((row) =>
            row.sessionKey === sessionKey
              ? { ...row, validationError: validation }
              : row,
          ),
        );
        return;
      }

      const { checkinIso, checkoutIso } = getActiveRowTimes(target);
      if (!checkinIso || !checkoutIso) {
        return;
      }

      setSessionRows((previous) =>
        previous.map((row) =>
          row.sessionKey === sessionKey
            ? {
                ...row,
                pendingAction: row.isNew ? "create" : "edit",
                feedback: null,
              }
            : row,
        ),
      );

      try {
        const endpoint = target.isNew
          ? "/api/payroll/session"
          : `/api/payroll/session/${target.sessionId}`;
        const method = target.isNew ? "POST" : "PUT";
        const response = await performProtectedFetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staffId: selectedCell.staffId,
            workDate: selectedCell.workDate,
            checkinTime: checkinIso,
            checkoutTime: checkoutIso,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message = (payload as { error?: string }).error ?? "No se pudo guardar la sesión.";
          throw new Error(message);
        }

        const saved = (payload as { session?: DaySession }).session;
        if (!saved) {
          throw new Error("No se recibió la sesión actualizada.");
        }

        setSessionRows((previous) =>
          sortSessionRows(
            previous.map((row) =>
              row.sessionKey === sessionKey
                ? {
                    ...row,
                    sessionId: saved.sessionId,
                    staffId: saved.staffId,
                    workDate: saved.workDate,
                    checkinTime: saved.checkinTime,
                    checkoutTime: saved.checkoutTime,
                    edits: Array.isArray(saved.edits) ? [...saved.edits] : [],
                    draftCheckin: toLocalInputValue(saved.checkinTime),
                    draftCheckout: toLocalInputValue(saved.checkoutTime),
                    isNew: false,
                    isEditing: false,
                    validationError: null,
                    feedback: null,
                    pendingAction: null,
                  }
                : row,
            ),
          ),
        );
        await refreshMatrixOnly();
        await refreshMonthStatusForStaff(selectedCell.staffId);
        await refreshMonthSummary();
        setToast({ message: "Cambios guardados", tone: "success" });
      } catch (error) {
        console.error("No se pudo guardar la sesión", error);
        const message =
          error instanceof Error ? error.message : "No se pudo guardar la sesión.";
        setSessionRows((previous) =>
          previous.map((row) =>
            row.sessionKey === sessionKey
              ? { ...row, feedback: message, pendingAction: null }
              : row,
          ),
        );
        setToast({ message: "No se pudo guardar", tone: "error" });
      }
    },
    [
      performProtectedFetch,
      refreshMatrixOnly,
      refreshMonthStatusForStaff,
      refreshMonthSummary,
      selectedCell,
    ],
  );

  const handleEditClick = useCallback(
    async (sessionKey: string) => {
      const rows = sessionRowsRef.current;
      const target = rows.find((row) => row.sessionKey === sessionKey);
      if (!target || target.pendingAction) {
        return;
      }
      if (!target.isEditing) {
        await enableRowEditing(sessionKey);
        return;
      }
      await saveRowChanges(sessionKey);
    },
    [enableRowEditing, saveRowChanges],
  );

  const handleDeleteClick = useCallback(
    async (sessionKey: string) => {
      const rows = sessionRowsRef.current;
      const target = rows.find((row) => row.sessionKey === sessionKey);
      if (!target || target.pendingAction) {
        return;
      }

      const confirmed = window.confirm("¿Eliminar esta sesión? Esta acción no se puede deshacer.");
      if (!confirmed) {
        return;
      }

      const allowed = await ensureManagementAccess();
      if (!allowed) return;

      if (target.sessionId == null) {
        setSessionRows((previous) => previous.filter((row) => row.sessionKey !== sessionKey));
        setToast({ message: "Cambios guardados", tone: "success" });
        return;
      }

      setSessionRows((previous) =>
        previous.map((row) =>
          row.sessionKey === sessionKey
            ? { ...row, pendingAction: "delete", feedback: null }
            : row,
        ),
      );

      try {
        const response = await performProtectedFetch(
          `/api/payroll/session/${target.sessionId}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              staffId: target.staffId,
              workDate: target.workDate,
            }),
          },
        );
        const payload =
          response.status === 204 ? {} : await response.json().catch(() => ({}));
        if (!response.ok) {
          const message = (payload as { error?: string }).error ?? "No se pudo eliminar la sesión.";
          throw new Error(message);
        }

        setSessionRows((previous) => previous.filter((row) => row.sessionKey !== sessionKey));
        await refreshMatrixOnly();
        await refreshMonthStatusForStaff(target.staffId);
        await refreshMonthSummary();
        setToast({ message: "Cambios guardados", tone: "success" });
      } catch (error) {
        console.error("No se pudo eliminar la sesión", error);
        const message =
          error instanceof Error ? error.message : "No se pudo eliminar la sesión.";
        setSessionRows((previous) =>
          previous.map((row) =>
            row.sessionKey === sessionKey
              ? { ...row, feedback: message, pendingAction: null }
              : row,
          ),
        );
        setToast({ message: "No se pudo guardar", tone: "error" });
      }
    },
    [
      ensureManagementAccess,
      performProtectedFetch,
      refreshMatrixOnly,
      refreshMonthStatusForStaff,
      refreshMonthSummary,
    ],
  );

  const cancelRowEditing = useCallback((sessionKey: string) => {
    setSessionRows((previous) =>
      previous.map((row) => {
        if (row.sessionKey !== sessionKey) return row;
        return {
          ...row,
          isEditing: false,
          draftCheckin: toLocalInputValue(row.checkinTime),
          draftCheckout: toLocalInputValue(row.checkoutTime),
          validationError: null,
          feedback: null,
          pendingAction: null,
        };
      }),
    );
  }, []);

  const recalculateCellWidth = useCallback((containerWidth: number, daysCount: number) => {
    if (!daysCount) return;
    const available =
      containerWidth - STAFF_COLUMN_WIDTH - TRAILING_COLUMNS_WIDTH - GRID_PADDING;
    const computed = available > 0 ? Math.floor(available / daysCount) : MIN_CELL_WIDTH;
    const desired = Math.min(PREFERRED_CELL_WIDTH, computed);
    setCellWidth(Math.max(MIN_CELL_WIDTH, desired));
  }, []);

  const totalMinutes = useMemo(
    () =>
      sessionRows.reduce((accumulator, row) => {
        const minutes = computeRowMinutes(row);
        return minutes != null ? accumulator + minutes : accumulator;
      }, 0),
    [sessionRows],
  );

  const totalHours = useMemo(() => Number((totalMinutes / 60).toFixed(2)), [totalMinutes]);

  const displayHours = sessionsLoading
    ? selectedCell?.rawHours ?? Number((totalMinutes / 60).toFixed(2))
    : totalHours;

  const minutesFromSelection = selectedCell
    ? Math.max(0, Math.round(selectedCell.rawHours * 60))
    : 0;
  const minutesForApproval = sessionsLoading
    ? minutesFromSelection
    : Math.max(0, Math.round(totalMinutes));
  const hoursForApproval = Number((minutesForApproval / 60).toFixed(2));
  const approvedMinutesFromServer =
    typeof dayApproval?.approvedMinutes === "number"
      ? Math.max(0, dayApproval.approvedMinutes)
      : null;
  const approvedHoursFromServer =
    approvedMinutesFromServer != null
      ? Number((approvedMinutesFromServer / 60).toFixed(2))
      : null;

  const handleApprove = useCallback(async () => {
    if (!selectedCell) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const hasIncompleteRow = sessionRows.some((row) => computeRowMinutes(row) == null);
      if (hasIncompleteRow) {
        throw new Error("Revisa las sesiones antes de aprobar: hay horarios incompletos.");
      }

      if (!Number.isFinite(totalMinutes) || totalMinutes < 0) {
        throw new Error("No pudimos calcular las horas registradas para este día.");
      }

      const approvedMinutes = Math.max(0, Math.round(totalMinutes));

      const response = await performProtectedFetch("/api/payroll/approve-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: selectedCell.staffId,
          workDate: selectedCell.workDate,
          approvedMinutes,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((body as { error?: string }).error ?? "No pudimos aprobar el día.");
      }
      await refreshMatrixOnly();
      await refreshMonthStatusForStaff(selectedCell.staffId);
      await refreshMonthSummary();
      setToast({ message: "Cambios guardados", tone: "success" });
      closeModal();
    } catch (err) {
      console.error("No se pudo aprobar el día", err);
      const message = err instanceof Error ? err.message : "No pudimos aprobar el día.";
      setActionError(message);
      setToast({ message: "No se pudo guardar", tone: "error" });
    } finally {
      setActionLoading(false);
    }
  }, [
    closeModal,
    performProtectedFetch,
    refreshMatrixOnly,
    refreshMonthStatusForStaff,
    refreshMonthSummary,
    selectedCell,
    sessionRows,
    totalMinutes,
  ]);

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

  const monthSummaryByStaff = useMemo(() => {
    const map = new Map<number, MonthSummaryRow>();
    for (const row of monthSummaryRows) {
      map.set(row.staffId, row);
    }
    return map;
  }, [monthSummaryRows]);

  useEffect(() => {
    sessionRowsRef.current = sessionRows;
  }, [sessionRows]);

  useEffect(() => {
    if (accessMode !== "readOnly") {
      setAmountPopoverStaffId(null);
    }
  }, [accessMode]);

  useEffect(() => {
    setAmountPopoverStaffId(null);
  }, [matrixData?.rows.length]);

  useEffect(() => {
    if (amountPopoverStaffId == null) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const ownerId = amountPopoverStaffId;
      const selector = `[data-amount-popover-owner="${ownerId}"]`;
      const container = document.querySelector(selector);
      if (!container) {
        setAmountPopoverStaffId(null);
        return;
      }
      if (event.target instanceof Node && container.contains(event.target)) {
        return;
      }
      setAmountPopoverStaffId(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAmountPopoverStaffId(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [amountPopoverStaffId]);

  const matrixDays = matrixData?.days ?? [];
  const hideApprovedAmounts = isReadOnlyMode || Boolean(matrixData?.amountsHidden);
  const effectiveCellWidth = Math.max(MIN_CELL_WIDTH, Math.floor(cellWidth));
  const cellVariant = useMemo(() => {
    if (effectiveCellWidth >= 64) return "relaxed" as const;
    if (effectiveCellWidth >= 52) return "comfortable" as const;
    if (effectiveCellWidth >= 44) return "compact" as const;
    return "tight" as const;
  }, [effectiveCellWidth]);
  const cellVisual = useMemo(() => {
    switch (cellVariant) {
      case "relaxed":
        return { height: "h-12", padding: "px-3 py-2", font: "text-sm" } as const;
      case "comfortable":
        return { height: "h-11", padding: "px-2.5 py-1.5", font: "text-[13px]" } as const;
      case "compact":
        return { height: "h-10", padding: "px-2 py-1.5", font: "text-xs" } as const;
      default:
        return { height: "h-9", padding: "px-1.5 py-1", font: "text-[11px]" } as const;
    }
  }, [cellVariant]);
  const compactCellText = cellVariant === "tight";
  const staffCount = matrixData?.rows.length ?? 0;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-20 h-72 w-72 -rotate-[18deg] rounded-[38px] bg-[#ffe6d2] opacity-70" />
        <div className="absolute right-0 top-6 h-60 w-60 rotate-[10deg] rounded-[34px] bg-[#dff8f2] opacity-80" />
        <div className="absolute bottom-0 left-1/2 h-[420px] w-[120%] -translate-x-1/2 rounded-t-[180px] bg-gradient-to-r from-[#ffeede] via-white to-[#c9f5ed]" />
      </div>

      {accessMode === "pending" ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-10 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[32px] border border-white/70 bg-white p-8 text-center shadow-[0_26px_60px_rgba(15,23,42,0.18)]">
            <h2 className="text-2xl font-black text-brand-deep">¿Cómo deseas entrar?</h2>
            <p className="mt-2 text-sm text-brand-ink-muted">
              Elige el modo de acceso. En modo gestión podrás editar y aprobar.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  setAccessMode("readOnly");
                  setPendingAccessMode(null);
                  setPinModalOpen(false);
                }}
                className="w-full rounded-full border border-brand-ink-muted/20 bg-white px-4 py-2 text-sm font-semibold text-brand-deep shadow-sm transition hover:-translate-y-[1px] hover:bg-brand-teal-soft/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal"
              >
                Solo lectura
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingAccessMode("management");
                  void waitForPin();
                }}
                className="w-full rounded-full border border-brand-teal bg-brand-teal px-4 py-2 text-sm font-semibold text-white shadow transition hover:-translate-y-[1px] hover:bg-brand-teal/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal"
              >
                Gestión (PIN)
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <main className="relative mx-auto flex w-full max-w-[2000px] flex-1 flex-col gap-10 px-4 py-12 sm:px-6 md:px-10 lg:px-12">
        {toast ? (
          <EphemeralToast
            message={toast.message}
            tone={toast.tone}
            onDismiss={() => setToast(null)}
          />
        ) : null}
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
          <div className="flex flex-col gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-4">
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
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                  isManagementMode
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border border-brand-ink-muted/30 bg-brand-deep-soft/30 text-brand-ink-muted"
                }`}
              >
                {isManagementMode ? "Modo gestión" : "Modo lectura"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setAmountPopoverStaffId(null);
                  setPendingAccessMode(null);
                  setAccessMode("pending");
                }}
                className="inline-flex items-center rounded-full border border-brand-ink-muted/30 px-3 py-1 text-xs font-semibold text-brand-ink-muted shadow-sm transition hover:-translate-y-[1px] hover:bg-brand-deep-soft/40 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-teal"
              >
                Cambiar modo
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-brand-ink-muted sm:text-sm">
              <label className="flex items-center gap-2">
                <span>Desde</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(event) => setCustomStartDate(event.target.value)}
                  className="rounded-full border border-brand-ink-muted/20 bg-white px-3 py-1 text-xs font-semibold text-brand-deep shadow focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] sm:text-sm"
                />
              </label>
              <label className="flex items-center gap-2">
                <span>Hasta</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(event) => setCustomEndDate(event.target.value)}
                  className="rounded-full border border-brand-ink-muted/20 bg-white px-3 py-1 text-xs font-semibold text-brand-deep shadow focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] sm:text-sm"
                />
              </label>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold sm:text-sm ${
                  usingCustomRange
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-600"
                    : "border border-brand-deep-soft/30 bg-brand-deep-soft/20 text-brand-ink-muted"
                }`}
              >
                {usingCustomRange ? "Rango manual activo" : "Usando mes completo"}
              </span>
              {customStartDate || customEndDate ? (
                <button
                  type="button"
                  onClick={() => {
                    setCustomStartDate("");
                    setCustomEndDate("");
                  }}
                  className="inline-flex items-center rounded-full border border-brand-ink-muted/20 px-3 py-1 text-xs font-semibold text-brand-ink-muted shadow-sm transition hover:-translate-y-[1px] hover:bg-brand-deep-soft/30 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] sm:text-sm"
                >
                  Limpiar rango
                </button>
              ) : null}
            </div>
            <p className={`text-xs ${rangeError ? "text-rose-600" : "text-brand-ink-muted"}`}>
              {rangeStatusText}
            </p>
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
                    Rango: <span className="font-semibold text-brand-deep">{activeStart}</span> a {" "}
                    <span className="font-semibold text-brand-deep">{activeEnd}</span>
                    <span className="ml-2 rounded-full border border-brand-ink-muted/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
                      {usingCustomRange ? "Manual" : "Mes"}
                    </span>
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
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-900">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        Editado
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-900">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Aprobado
                      </span>
                    </div>
                    <div className="overflow-x-auto overflow-y-hidden rounded-2xl border border-brand-ink-muted/10">
                      <table className="w-full table-fixed border-collapse text-[10px] leading-tight text-brand-deep">
                        <colgroup>
                          <col style={{ width: `${STAFF_COLUMN_WIDTH}px` }} />
                          {matrixDays.map((day) => (
                            <col key={`col-${day}`} style={{ width: `${effectiveCellWidth}px` }} />
                          ))}
                          <col style={{ width: `${APPROVED_AMOUNT_COLUMN_WIDTH}px` }} />
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
                            <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-brand-ink">
                              Monto aprobado
                            </th>
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
                            const monthSummary = monthSummaryByStaff.get(row.staffId);
                            const staffName = resolveStaffName(row);
                            const paidValue = monthStatus?.paid ?? false;
                            const paidAtIsoValue = toIsoDateOnly(monthStatus?.paidAt ?? null);
                            const paidAtInputValue =
                              paidAtDrafts[row.staffId] ?? (paidAtIsoValue ?? "");
                            const isStatusSaving = Boolean(monthStatusSaving[row.staffId]);
                            const statusError = monthStatusErrors[row.staffId] ?? null;

                            return (
                              <tr key={row.staffId} className="odd:bg-white even:bg-brand-deep-soft/20">
                                <th className="px-3 py-2 text-left text-[11px] font-semibold text-brand-deep">
                                  <div className="flex flex-col gap-0.5 whitespace-nowrap">
                                    <span
                                      className={`${compactCellText ? "text-[12px]" : "text-[14px]"} max-w-[84px] truncate`}
                                      title={staffName}
                                    >
                                      {staffName}
                                    </span>
                                    <span className="text-[9px] font-medium text-brand-ink-muted">
                                      ID: {row.staffId}
                                    </span>
                                  </div>
                                </th>
                                {row.cells.map((cell) => {
                                  const hasApprovedValue = cell.approvedHours != null;
                                  const cellHours =
                                    hasApprovedValue && (cell.approved || cell.hasEdits)
                                      ? cell.approvedHours!
                                      : cell.rawHours;
                                  const cellTone = cell.hasEdits
                                    ? "border-amber-400 bg-amber-300/90 text-amber-900 hover:bg-amber-300"
                                    : cell.approved
                                      ? "border-emerald-500 bg-emerald-500/90 text-white hover:bg-emerald-500"
                                      : "border-orange-500 bg-orange-500/90 text-white hover:bg-orange-500";
                                  return (
                                    <td key={cell.date} className="px-1 py-1 text-center">
                                      <button
                                        type="button"
                                        onClick={() => openModal(row, cell)}
                                        className={`inline-flex w-full items-center justify-center rounded-full border font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal-soft ${cellTone} ${cellVisual.height} ${cellVisual.padding} ${cellVisual.font}`}
                                        style={{ minWidth: `${effectiveCellWidth}px` }}
                                      >
                                        <span className="whitespace-nowrap">
                                          {hoursFormatter.format(cellHours)}
                                        </span>
                                      </button>
                                    </td>
                                  );
                                })}
                                <td className="relative px-2 py-1 text-right font-semibold text-brand-deep">
                                  {hideApprovedAmounts ? (
                                    <div
                                      className="relative inline-flex items-center justify-end gap-2"
                                      data-amount-popover-owner={row.staffId}
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setAmountPopoverStaffId((previous) =>
                                            previous === row.staffId ? null : row.staffId,
                                          )
                                        }
                                        className="rounded-full border border-brand-ink-muted/30 bg-white px-3 py-1 text-[11px] font-semibold text-brand-deep shadow-sm transition hover:-translate-y-[1px] hover:bg-brand-deep-soft/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal"
                                      >
                                        Ver monto
                                      </button>
                                      {amountPopoverStaffId === row.staffId ? (
                                        <div className="absolute right-0 top-full z-10 mt-2 w-max rounded-2xl border border-brand-ink-muted/20 bg-white px-3 py-2 text-xs font-semibold text-brand-deep shadow-xl">
                                          {toCurrency(monthSummary?.approvedAmount ?? null)}
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : (
                                    toCurrency(monthSummary?.approvedAmount ?? null)
                                  )}
                                </td>
                                <td className="px-2 py-1 text-center">
                                  {isManagementMode ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (paidValue) {
                                          setPaidAtDrafts((previous) => ({
                                            ...previous,
                                            [row.staffId]: "",
                                          }));
                                        }
                                        void updateMonthStatus(row.staffId, monthStatus, {
                                          paid: !paidValue,
                                        });
                                      }}
                                      disabled={isStatusSaving}
                                      className={`inline-flex min-w-[52px] items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal-soft ${
                                        paidValue
                                          ? "border-emerald-500 bg-emerald-500/80 text-white hover:bg-emerald-500"
                                          : "border-orange-400 bg-orange-100 text-orange-900 hover:bg-orange-200"
                                      } ${isStatusSaving ? "opacity-60" : ""}`}
                                    >
                                      {paidValue ? "Sí" : "No"}
                                    </button>
                                  ) : (
                                    <span
                                      className={`inline-flex min-w-[52px] items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                                        paidValue
                                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                          : "border-orange-200 bg-orange-50 text-orange-700"
                                      }`}
                                    >
                                      {paidValue ? "Sí" : "No"}
                                    </span>
                                  )}
                                </td>
                                <td className="px-2 py-1 text-center text-brand-ink-muted">
                                  {isManagementMode ? (
                                    <div className="flex flex-col items-center gap-1">
                                      <input
                                        type="date"
                                        value={paidAtInputValue}
                                        onChange={(event) => {
                                          const { value } = event.target;
                                          setPaidAtDrafts((previous) => ({
                                            ...previous,
                                            [row.staffId]: value,
                                          }));
                                          setMonthStatusErrors((previous) => ({
                                            ...previous,
                                            [row.staffId]: null,
                                          }));

                                          if (!value.length) {
                                            if (paidAtIsoValue) {
                                              void updateMonthStatus(row.staffId, monthStatus, {
                                                paid: paidValue,
                                                paidAt: null,
                                              });
                                            }
                                            return;
                                          }

                                          if (value === paidAtIsoValue) {
                                            return;
                                          }

                                          void updateMonthStatus(row.staffId, monthStatus, {
                                            paid: paidValue,
                                            paidAt: value,
                                          });
                                        }}
                                        disabled={isStatusSaving || !paidValue}
                                        className="w-full max-w-[140px] rounded-full border border-brand-ink-muted/30 bg-white px-3 py-1 text-[11px] font-medium text-brand-deep shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal-soft disabled:cursor-not-allowed disabled:opacity-60"
                                      />
                                      {isStatusSaving ? (
                                        <span className="text-[10px] text-brand-ink-muted">Guardando…</span>
                                      ) : statusError ? (
                                        <span className="text-[10px] font-medium text-brand-orange">{statusError}</span>
                                      ) : paidAtIsoValue ? (
                                        <span className="text-[10px] text-brand-ink-muted">
                                          {paidDateFormatter.format(new Date(`${paidAtIsoValue}T12:00:00Z`))}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-brand-ink-muted">—</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-brand-ink-muted">
                                      {paidAtIsoValue
                                        ? paidDateFormatter.format(new Date(`${paidAtIsoValue}T12:00:00Z`))
                                        : "—"}
                                    </span>
                                  )}
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
                  {humanDateFormatter.format(new Date(`${selectedCell.workDate}T12:00:00Z`))}
                </p>
              </div>
              <div className="rounded-[24px] border border-brand-ink-muted/10 bg-brand-deep-soft/30 px-5 py-4 text-sm text-brand-deep">
                Horas registradas: {hoursFormatter.format(displayHours)} h
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
              ) : (
                <div className="space-y-4">
                  {sessionRows.length ? (
                    sessionRows.map((session, index) => {
                      const editingDisabled =
                        sessionsLoading
                        || actionLoading
                        || !isManagementMode
                        || session.pendingAction === "delete";
                      const deletingDisabled =
                        sessionsLoading
                        || actionLoading
                        || !isManagementMode
                        || session.pendingAction === "edit"
                        || session.pendingAction === "create";
                      const inputDisabled =
                        !session.isEditing
                        || session.pendingAction != null
                        || sessionsLoading
                        || actionLoading
                        || !isManagementMode;
                      const sortedEdits = session.edits.length
                        ? [...session.edits].sort((a, b) => {
                            const aTime = a.editedAt ? new Date(a.editedAt).getTime() : 0;
                            const bTime = b.editedAt ? new Date(b.editedAt).getTime() : 0;
                            return bTime - aTime;
                          })
                        : [];

                      return (
                        <div
                          key={session.sessionKey}
                          className="rounded-3xl border border-brand-ink-muted/15 bg-white px-5 py-4 shadow-inner"
                        >
                          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap items-center gap-2 text-brand-deep">
                              <span className="text-sm font-semibold">
                                {session.sessionId != null
                                  ? `Sesión ID ${session.sessionId}`
                                  : `Nueva sesión ${index + 1}`}
                              </span>
                              {session.isNew ? (
                                <span className="inline-flex items-center rounded-full bg-brand-teal-soft/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-deep">
                                  Nueva
                                </span>
                              ) : null}
                              {session.pendingAction ? (
                                <span className="inline-flex items-center rounded-full bg-brand-ink-muted/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-ink-muted">
                                  {session.pendingAction === "delete" ? "Eliminando…" : "Guardando…"}
                                </span>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {isManagementMode ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleEditClick(session.sessionKey)}
                                    disabled={editingDisabled}
                                    className="inline-flex items-center justify-center rounded-full border border-brand-ink-muted/20 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:bg-brand-deep-soft/50 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {session.pendingAction === "edit" || session.pendingAction === "create"
                                      ? "Guardando…"
                                      : session.isEditing
                                        ? "Guardar"
                                        : "Editar"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={addBlankSession}
                                    disabled={sessionsLoading || actionLoading}
                                    className="inline-flex items-center justify-center rounded-full border border-brand-ink-muted/20 bg-brand-teal-soft/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:bg-brand-teal-soft/50 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Agregar sesión
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteClick(session.sessionKey)}
                                    disabled={deletingDisabled}
                                    className="inline-flex items-center justify-center rounded-full border border-brand-ink-muted/20 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:bg-brand-deep-soft/50 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {session.pendingAction === "delete" ? "Eliminando…" : "Eliminar"}
                                  </button>
                                </>
                              ) : (
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
                                  Visualización
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <label className="flex flex-col gap-1 text-sm text-brand-deep">
                              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-ink-muted">
                                Entrada
                              </span>
                              <input
                                type="datetime-local"
                                value={session.isEditing
                                  ? session.draftCheckin
                                  : toLocalInputValue(session.checkinTime)}
                                onChange={(event) =>
                                  handleDraftChange(session.sessionKey, "checkin", event.target.value)
                                }
                                disabled={inputDisabled}
                                className="rounded-2xl border border-brand-ink-muted/20 bg-white px-3 py-2 text-sm font-medium text-brand-deep shadow focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-60"
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-sm text-brand-deep">
                              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-ink-muted">
                                Salida
                              </span>
                              <input
                                type="datetime-local"
                                value={session.isEditing
                                  ? session.draftCheckout
                                  : toLocalInputValue(session.checkoutTime)}
                                onChange={(event) =>
                                  handleDraftChange(session.sessionKey, "checkout", event.target.value)
                                }
                                disabled={inputDisabled}
                                className="rounded-2xl border border-brand-ink-muted/20 bg-white px-3 py-2 text-sm font-medium text-brand-deep shadow focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-60"
                              />
                            </label>
                          </div>
                          {session.validationError ? (
                            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-brand-orange">
                              {session.validationError}
                            </p>
                          ) : null}
                          {sortedEdits.length ? (
                            <div className="mt-3 space-y-2 rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                                Historial de ediciones
                              </p>
                              <div className="space-y-3">
                                {sortedEdits.map((edit, editIndex) => {
                                  const originalRange = formatEditRange(
                                    edit.originalCheckin ?? null,
                                    edit.originalCheckout ?? null,
                                    edit.originalMinutes ?? null,
                                  );
                                  const updatedRange = formatEditRange(
                                    edit.newCheckin ?? null,
                                    edit.newCheckout ?? null,
                                    edit.newMinutes ?? null,
                                  );
                                  const editedTimestamp = formatTimestamp(edit.editedAt ?? null);
                                  const editedByLabel =
                                    edit.editedByStaffId != null
                                      ? ` · ID ${edit.editedByStaffId}`
                                      : "";
                                  return (
                                    <div
                                      key={`${session.sessionKey}-edit-${editIndex}-${edit.editedAt ?? editIndex}`}
                                      className="space-y-1 border-t border-amber-200 pt-2 first:border-t-0 first:pt-0"
                                    >
                                      <div className="font-semibold text-amber-800">
                                        Original:
                                        <span className="ml-1 font-medium text-amber-900">
                                          {originalRange}
                                        </span>
                                      </div>
                                      <div className="font-semibold text-amber-800">
                                        → Actual:
                                        <span className="ml-1 font-medium text-amber-900">
                                          {updatedRange}
                                        </span>
                                      </div>
                                      {editedTimestamp ? (
                                        <div className="text-[11px] font-medium text-amber-700">
                                          Editado el {editedTimestamp}
                                          {editedByLabel}
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                          {session.feedback ? (
                            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-brand-orange">
                              {session.feedback}
                            </p>
                          ) : null}
                          {session.isEditing && !session.isNew && session.pendingAction == null ? (
                            <button
                              type="button"
                              onClick={() => cancelRowEditing(session.sessionKey)}
                              className="mt-2 text-xs font-semibold uppercase tracking-wide text-brand-ink-muted transition hover:text-brand-deep"
                            >
                              Cancelar edición
                            </button>
                          ) : null}
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-3xl border border-brand-ink-muted/20 bg-brand-deep-soft/40 px-5 py-4 text-sm text-brand-ink-muted">
                      <div>No hay sesiones registradas para este día.</div>
                      {isManagementMode ? (
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={addBlankSession}
                            disabled={sessionsLoading || actionLoading}
                            className="inline-flex items-center justify-center rounded-full border border-brand-ink-muted/20 bg-brand-teal-soft/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:bg-brand-teal-soft/50 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Agregar sesión
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>

            {actionError ? (
              <div className="mt-4 rounded-3xl border border-brand-orange/70 bg-brand-orange/10 px-5 py-3 text-sm font-medium text-brand-ink">
                {actionError}
              </div>
            ) : null}

            {isManagementMode ? (
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-col gap-1 text-sm text-brand-deep">
                  <span className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-ink-muted">
                    Horas a aprobar (h)
                  </span>
                  <div className="w-full rounded-2xl border border-brand-ink-muted/30 bg-white px-3 py-2 text-sm font-semibold text-brand-deep shadow">
                    {hoursFormatter.format(hoursForApproval)} h
                  </div>
                </div>
                {dayApproval?.approvedAt ? (
                  <span className="text-xs text-brand-ink-muted">
                    Última aprobación: {hoursFormatter.format(approvedHoursFromServer ?? hoursForApproval)} h · {formatTimestamp(dayApproval.approvedAt) ?? "—"}
                  </span>
                ) : null}
              </div>
            ) : approvedHoursFromServer != null ? (
              <div className="mt-4 rounded-2xl border border-brand-ink-muted/15 bg-brand-deep-soft/30 px-4 py-3 text-xs text-brand-ink-muted">
                Horas aprobadas: {hoursFormatter.format(approvedHoursFromServer)} h
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex items-center justify-center rounded-full border border-brand-ink-muted/20 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:bg-brand-deep-soft/50 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
              >
                {isManagementMode ? "Cancelar" : "Cerrar"}
              </button>
              {isManagementMode ? (
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="inline-flex items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-500/90 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-emerald-500 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ? "Procesando…" : "Aprobar día"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {pinModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 backdrop-blur-sm">
          <div className="relative w-full max-w-md">
            <button
              type="button"
              onClick={() => {
                setPinModalOpen(false);
                resolvePinRequest(null);
              }}
              className="absolute right-2 top-2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white text-lg font-semibold text-brand-ink shadow hover:-translate-y-[1px] hover:bg-brand-teal-soft/40 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
              aria-label="Cerrar validación"
            >
              ×
            </button>
            <PinPrompt
              scope="manager"
              title="PIN de gerencia requerido"
              description="Confirma el PIN de gerencia para continuar."
              ctaLabel="Validar PIN"
              onSuccess={(result) => {
                setPinModalOpen(false);
                const tokenValue = result?.token ?? null;
                if (tokenValue) {
                  const expiresAtSeconds =
                    result?.expiresAt ??
                    (result?.expiresIn != null
                      ? Math.floor(Date.now() / 1000) + result.expiresIn
                      : null);
                  const expiresAt =
                    typeof expiresAtSeconds === "number"
                      ? expiresAtSeconds * 1000
                      : null;
                  const tokenInfo: ManagerAuthToken = {
                    token: tokenValue,
                    expiresAt,
                  };
                  setManagerToken(tokenInfo);
                  resolvePinRequest(tokenInfo);
                } else {
                  setManagerToken(null);
                  resolvePinRequest(null);
                }
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
