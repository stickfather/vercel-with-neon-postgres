export type StudentStatusKey =
  | "active"
  | "frozen"
  | "invalid"
  | "online"
  | "graduated"
  | "contract_terminated";

export type StudentStatusConfig = {
  label: string;
  badgeClassName: string;
  showEndDate: boolean;
  endDateLabel?: string;
  dateField?: "contractEnd" | "graduationDate";
};

export const STUDENT_STATUS_ORDER: StudentStatusKey[] = [
  "active",
  "frozen",
  "invalid",
  "online",
  "graduated",
  "contract_terminated",
];

export const STUDENT_STATUS_CONFIG: Record<
  StudentStatusKey,
  StudentStatusConfig
> = {
  active: {
    label: "activo",
    badgeClassName: "bg-emerald-100 text-emerald-700",
    showEndDate: false,
  },
  frozen: {
    label: "congelado",
    badgeClassName: "bg-cyan-100 text-cyan-700",
    showEndDate: false,
  },
  invalid: {
    label: "inválido",
    badgeClassName: "bg-rose-200 text-rose-700",
    showEndDate: false,
  },
  online: {
    label: "online",
    badgeClassName: "bg-violet-100 text-violet-700",
    showEndDate: false,
  },
  graduated: {
    label: "graduado",
    badgeClassName: "bg-amber-100 text-amber-700",
    showEndDate: true,
    endDateLabel: "Graduación",
    dateField: "graduationDate",
  },
  contract_terminated: {
    label: "terminado",
    badgeClassName: "bg-slate-200 text-slate-700",
    showEndDate: true,
    endDateLabel: "Salida",
    dateField: "contractEnd",
  },
};

export const UNKNOWN_STUDENT_STATUS_CONFIG: StudentStatusConfig = {
  label: "sin estado",
  badgeClassName: "bg-brand-ink-muted/15 text-brand-ink-muted",
  showEndDate: false,
};

export function normalizeStudentStatus(
  value: string | null | undefined,
): StudentStatusKey | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return (STUDENT_STATUS_ORDER.find((status) => status === normalized) ?? null) as
    | StudentStatusKey
    | null;
}

export function getStudentStatusDisplay(
  value: string | null | undefined,
): { key: StudentStatusKey | null } & StudentStatusConfig {
  const key = normalizeStudentStatus(value);
  if (key) {
    return { key, ...STUDENT_STATUS_CONFIG[key] };
  }
  return { key: null, ...UNKNOWN_STUDENT_STATUS_CONFIG };
}

export type StudentStatusSummaryItem = {
  status: StudentStatusKey;
  label: string;
  count: number;
  percentage: number;
};

export function buildStudentStatusSummary(
  students: Array<{ status: string | null | undefined }>,
): StudentStatusSummaryItem[] {
  const total = students.length;
  const counts: Record<StudentStatusKey, number> = {
    active: 0,
    frozen: 0,
    invalid: 0,
    online: 0,
    graduated: 0,
    contract_terminated: 0,
  };

  for (const student of students) {
    const key = normalizeStudentStatus(student.status);
    if (!key) {
      continue;
    }
    counts[key] += 1;
  }

  return STUDENT_STATUS_ORDER.map((status) => {
    const count = counts[status] ?? 0;
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

    return {
      status,
      label: STUDENT_STATUS_CONFIG[status].label,
      count,
      percentage,
    };
  });
}
