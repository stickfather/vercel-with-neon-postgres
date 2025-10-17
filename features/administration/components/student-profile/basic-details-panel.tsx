"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type {
  BasicDetailFieldType,
  StudentBasicDetailFieldConfig,
  StudentBasicDetails,
} from "@/features/administration/data/student-profile";
import { STUDENT_BASIC_DETAIL_FIELDS } from "@/features/administration/data/student-profile";

type Props = {
  studentId: number;
  details: StudentBasicDetails | null;
};

type FormState = StudentBasicDetails | null;

const BOOLEAN_LABEL: Record<string, string> = {
  true: "Sí",
  false: "No",
};

const STATUS_STYLE_MAP: Record<string, { label: string; className: string }> = {
  active: { label: "Activo", className: "bg-emerald-100 text-emerald-700" },
  activo: { label: "Activo", className: "bg-emerald-100 text-emerald-700" },
  graduated: { label: "Graduado", className: "bg-sky-100 text-sky-700" },
  graduado: { label: "Graduado", className: "bg-sky-100 text-sky-700" },
  slow_progression: { label: "Progreso lento", className: "bg-amber-100 text-amber-700" },
  progreso_lento: { label: "Progreso lento", className: "bg-amber-100 text-amber-700" },
  absent: { label: "Ausente", className: "bg-rose-100 text-rose-700" },
  ausente: { label: "Ausente", className: "bg-rose-100 text-rose-700" },
  inactive: { label: "Inactivo", className: "bg-slate-200 text-slate-700" },
  inactivo: { label: "Inactivo", className: "bg-slate-200 text-slate-700" },
  invalid: { label: "Inválido", className: "bg-rose-200 text-rose-700" },
  invalido: { label: "Inválido", className: "bg-rose-200 text-rose-700" },
  on_hold: { label: "En pausa", className: "bg-amber-100 text-amber-700" },
  paused: { label: "En pausa", className: "bg-amber-100 text-amber-700" },
  en_pausa: { label: "En pausa", className: "bg-amber-100 text-amber-700" },
  frozen: { label: "Congelado", className: "bg-cyan-100 text-cyan-700" },
  congelado: { label: "Congelado", className: "bg-cyan-100 text-cyan-700" },
  dropout: { label: "Retirado", className: "bg-rose-100 text-rose-700" },
  retirado: { label: "Retirado", className: "bg-rose-100 text-rose-700" },
  prospect: { label: "Prospecto", className: "bg-slate-200 text-slate-700" },
  prospecto: { label: "Prospecto", className: "bg-slate-200 text-slate-700" },
};

const DEFAULT_STATUS_CLASS = "bg-brand-deep-soft text-brand-deep";

const FINAL_ROW_FIELD_KEYS = new Set<
  StudentBasicDetailFieldConfig["key"]
>([
  "hasSpecialNeeds",
  "isOnline",
  "lastLessonId",
  "lastSeenAt",
  "updatedAt",
  "createdAt",
]);

type StudentFlagKey =
  | "isNewStudent"
  | "isExamApproaching"
  | "isExamPreparation"
  | "hasSpecialNeeds"
  | "isAbsent7d"
  | "isSlowProgress14d"
  | "instructivoActive"
  | "instructivoOverdue";

const FLAG_VALUE_KEYS: Record<StudentFlagKey, Array<keyof StudentBasicDetails>> = {
  isNewStudent: ["isNewStudent"],
  isExamApproaching: ["isExamApproaching"],
  isExamPreparation: ["isExamPreparation"],
  hasSpecialNeeds: ["hasSpecialNeeds"],
  isAbsent7d: ["isAbsent7d", "isAbsent7Days"],
  isSlowProgress14d: ["isSlowProgress14d", "isSlowProgress14Days"],
  instructivoActive: ["instructivoActive", "hasActiveInstructive"],
  instructivoOverdue: ["instructivoOverdue", "hasOverdueInstructive"],
};

const FLAG_DEFINITIONS: ReadonlyArray<{
  key: StudentFlagKey;
  label: string;
  className: string;
  dotClass: string;
}> = [
  {
    key: "isNewStudent",
    label: "Nuevo",
    className: "bg-emerald-100 text-emerald-700",
    dotClass: "bg-emerald-500",
  },
  {
    key: "isExamApproaching",
    label: "Examen pronto",
    className: "bg-amber-100 text-amber-700",
    dotClass: "bg-amber-500",
  },
  {
    key: "isExamPreparation",
    label: "Prep. examen",
    className: "bg-sky-100 text-sky-700",
    dotClass: "bg-sky-500",
  },
  {
    key: "hasSpecialNeeds",
    label: "Necesidades especiales",
    className: "bg-violet-100 text-violet-700",
    dotClass: "bg-violet-500",
  },
  {
    key: "isAbsent7d",
    label: "Ausente 7d",
    className: "bg-rose-100 text-rose-700",
    dotClass: "bg-rose-500",
  },
  {
    key: "isSlowProgress14d",
    label: "Progreso lento",
    className: "bg-orange-100 text-orange-700",
    dotClass: "bg-orange-500",
  },
  {
    key: "instructivoActive",
    label: "Instructivo activo",
    className: "bg-indigo-100 text-indigo-700",
    dotClass: "bg-indigo-500",
  },
  {
    key: "instructivoOverdue",
    label: "Instructivo vencido",
    className: "bg-red-100 text-red-700",
    dotClass: "bg-red-500",
  },
];

function getInputType(field: StudentBasicDetailFieldConfig) {
  switch (field.type) {
    case "date":
      return "date";
    case "number":
      return "number";
    default:
      return "text";
  }
}

function formatReadOnlyValue(
  value: string | boolean | null,
  type: BasicDetailFieldType,
): string {
  if (type === "boolean") {
    return BOOLEAN_LABEL[String(Boolean(value))];
  }

  if (typeof value === "string") {
    return value.length ? value : "Sin registrar";
  }

  if (value == null) {
    return "Sin registrar";
  }

  return String(value);
}

function getDisplayValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value == null) {
    return "";
  }
  return String(value);
}

function sanitizeValue(value: unknown, type: BasicDetailFieldType): unknown {
  if (type === "boolean") {
    return Boolean(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  if (value == null) {
    return null;
  }

  return value;
}

function normalizeStatusKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function formatStatusLabel(value: string): string {
  const cleaned = value.replace(/[_-]+/g, " ").replace(/\s{2,}/g, " ").trim();
  if (!cleaned) return "Estado";
  return cleaned
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function BasicDetailsPanel({ studentId, details }: Props) {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>(details);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setFormState(details);
  }, [details]);

  const editableFields = useMemo(
    () => STUDENT_BASIC_DETAIL_FIELDS.filter((field) => field.editable),
    [],
  );

  const orderedFields = useMemo(() => {
    const preferredOrder: Array<StudentBasicDetailFieldConfig["key"]> = [
      "fullName",
      "representativeName",
      "representativePhone",
      "representativeEmail",
      "contractStart",
      "contractEnd",
      "frozenStart",
      "frozenEnd",
      "currentLevel",
      "plannedLevelMin",
      "plannedLevelMax",
      "hasSpecialNeeds",
      "isOnline",
    ];

    const fieldMap = new Map(
      STUDENT_BASIC_DETAIL_FIELDS.filter((field) => field.key !== "status").map((field) => [field.key, field]),
    );

    const result: StudentBasicDetailFieldConfig[] = [];
    for (const key of preferredOrder) {
      const field = fieldMap.get(key);
      if (field) {
        result.push(field);
        fieldMap.delete(key);
      }
    }

    fieldMap.forEach((field) => {
      result.push(field);
    });

    return result;
  }, []);

  const statusBadges = useMemo(() => {
    if (!formState?.status) {
      return [] as Array<{ key: string; label: string; className: string }>;
    }

    const tokens = formState.status
      .replace(/[;\r\n]+/g, ",")
      .split(/[,|/]/)
      .map((token) => token.trim())
      .filter(Boolean);

    const seen = new Set<string>();
    const entries: Array<{ key: string; label: string; className: string }> = [];

    tokens.forEach((token, index) => {
      const normalized = normalizeStatusKey(token);
      const dedupeKey = normalized || `${token}-${index}`;
      if (seen.has(dedupeKey)) {
        return;
      }
      seen.add(dedupeKey);

      const style =
        STATUS_STYLE_MAP[normalized] ?? STATUS_STYLE_MAP[normalized.replace(/s$/, "")] ?? null;
      entries.push({
        key: dedupeKey,
        label: style?.label ?? formatStatusLabel(token),
        className: style?.className ?? DEFAULT_STATUS_CLASS,
      });
    });

    return entries;
  }, [formState?.status]);

  const flagBadges = useMemo(() => {
    if (!formState) {
      return [] as Array<{ key: string; label: string; className: string; dotClass: string }>;
    }

    return FLAG_DEFINITIONS.filter((flag) => {
      const candidates = FLAG_VALUE_KEYS[flag.key] ?? [];
      return candidates.some((candidate) => Boolean((formState as Record<string, unknown>)[candidate]));
    }).map((flag) => ({
      key: flag.key,
      label: flag.label,
      className: flag.className,
      dotClass: flag.dotClass,
    }));
  }, [formState]);

  if (!formState) {
    return (
      <section className="flex flex-col gap-4 rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_18px_44px_rgba(15,23,42,0.12)] backdrop-blur">
        <header className="flex flex-col gap-1 text-left">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-deep">Datos básicos</span>
          <h2 className="text-xl font-bold text-brand-deep">Estudiante no encontrado</h2>
        </header>
        <p className="text-sm text-brand-ink-muted">
          No pudimos localizar la ficha del estudiante. Revisa la vista de gestión o intenta nuevamente.
        </p>
      </section>
    );
  }

  const handleFieldChange = (
    field: StudentBasicDetailFieldConfig,
    value: string | boolean,
  ) => {
    setFormState((previous) => {
      if (!previous) return previous;
      const nextValue = field.type === "boolean" ? Boolean(value) : (value as string);
      return {
        ...previous,
        [field.key]: nextValue,
      };
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState || isPending) return;

    const payload: Record<string, unknown> = {};

    for (const field of editableFields) {
      const rawValue = (formState as Record<string, unknown>)[field.key];
      payload[field.key] = sanitizeValue(rawValue, field.type);
    }

    setError(null);
    setStatusMessage(null);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(
            `/api/students/${studentId}/basic-details`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            },
          );

          const data = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(data?.error ?? "No se pudo guardar la información.");
          }

          setFormState((previous) => {
            const nextData = data as StudentBasicDetails;
            if (!previous) {
              return nextData;
            }
            return {
              ...nextData,
              isNewStudent: previous.isNewStudent,
              isExamApproaching: previous.isExamApproaching,
              isExamPreparation: previous.isExamPreparation,
              isAbsent7d: previous.isAbsent7d ?? previous.isAbsent7Days,
              isAbsent7Days: previous.isAbsent7Days ?? previous.isAbsent7d,
              isSlowProgress14d: previous.isSlowProgress14d ?? previous.isSlowProgress14Days,
              isSlowProgress14Days: previous.isSlowProgress14Days ?? previous.isSlowProgress14d,
              instructivoActive: previous.instructivoActive ?? previous.hasActiveInstructive,
              hasActiveInstructive: previous.hasActiveInstructive ?? previous.instructivoActive,
              instructivoOverdue: previous.instructivoOverdue ?? previous.hasOverdueInstructive,
              hasOverdueInstructive: previous.hasOverdueInstructive ?? previous.instructivoOverdue,
            };
          });
          setStatusMessage("Cambios guardados correctamente.");
          router.refresh();
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo guardar la información. Inténtalo nuevamente.",
          );
        }
      })();
    });
  };

  return (
    <section className="flex flex-col gap-6 rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_24px_58px_rgba(15,23,42,0.12)] backdrop-blur">
      <header className="flex flex-col gap-1 text-left">
        <h2 className="text-2xl font-bold text-brand-deep">Datos básicos</h2>
        <p className="text-sm text-brand-ink-muted">
          Actualiza la información de contacto y seguimiento. El estado se actualiza automáticamente según la actividad.
        </p>
      </header>
      {error && (
        <p className="rounded-3xl border border-brand-orange bg-white/85 px-4 py-3 text-sm font-medium text-brand-ink">
          {error}
        </p>
      )}
      {statusMessage && (
        <p className="rounded-3xl border border-brand-teal bg-brand-teal-soft/60 px-4 py-3 text-sm font-medium text-brand-teal">
          {statusMessage}
        </p>
      )}
      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
            Estado y banderas
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {statusBadges.length ? (
              statusBadges.map((badge) => (
                <span
                  key={badge.key}
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${badge.className}`}
                >
                  {badge.label}
                </span>
              ))
            ) : (
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${DEFAULT_STATUS_CLASS}`}>
                Estado no disponible
              </span>
            )}
            {flagBadges.length ? (
              flagBadges.map((badge) => (
                <span
                  key={`flag-${badge.key}`}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${badge.className}`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 rounded-full ${badge.dotClass}`}
                  />
                  <span className="leading-tight">{badge.label}</span>
                </span>
              ))
            ) : (
              <span className="inline-flex items-center rounded-full bg-brand-ink-muted/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-ink">
                Sin banderas activas
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {orderedFields.map((field) => {
            const value = (formState as Record<string, unknown>)[field.key] ?? null;
            let gridSpanClass = "col-span-1";
            if (field.type === "textarea") {
              gridSpanClass += " md:col-span-2 xl:col-span-6";
            } else if (!field.editable || field.type === "datetime") {
              gridSpanClass += " md:col-span-2 xl:col-span-3";
            } else {
              gridSpanClass += " md:col-span-1 xl:col-span-2";
            }

            if (FINAL_ROW_FIELD_KEYS.has(field.key)) {
              gridSpanClass = "col-span-1 md:col-span-1 xl:col-span-1";
            }

            if (!field.editable) {
              return (
                <div
                  key={field.key}
                  className={`flex h-full flex-col gap-1.5 rounded-2xl bg-white/95 p-4 shadow-inner ${gridSpanClass}`}
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
                    {field.label}
                  </span>
                  <span className="text-sm font-semibold text-brand-deep">
                    {formatReadOnlyValue(value as string | boolean | null, field.type)}
                  </span>
                </div>
              );
            }

            if (field.type === "boolean") {
              const checked = Boolean(value);
              return (
                <label
                  key={field.key}
                  htmlFor={`basic-${field.key}`}
                  className={`flex h-full flex-col gap-3 rounded-2xl bg-white/95 p-4 shadow-inner ${gridSpanClass}`}
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
                    {field.label}
                  </span>
                  <span className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-brand-deep">
                      {checked ? "Sí" : "No"}
                    </span>
                    <input
                      id={`basic-${field.key}`}
                      type="checkbox"
                      checked={checked}
                      disabled={isPending}
                      onChange={(event) => handleFieldChange(field, event.target.checked)}
                      className="h-5 w-5 rounded border-brand-deep-soft text-brand-teal focus:ring-brand-teal"
                    />
                  </span>
                </label>
              );
            }

            if (field.type === "textarea") {
              return (
                <label
                  key={field.key}
                  htmlFor={`basic-${field.key}`}
                  className={`flex h-full flex-col gap-2 rounded-2xl bg-white/95 p-4 shadow-inner ${gridSpanClass}`}
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
                    {field.label}
                  </span>
                  <textarea
                    id={`basic-${field.key}`}
                    name={field.key}
                    disabled={isPending}
                    value={getDisplayValue(value)}
                    onChange={(event) => handleFieldChange(field, event.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm leading-relaxed text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </label>
              );
            }

            return (
              <label
                key={field.key}
                htmlFor={`basic-${field.key}`}
                className={`flex h-full flex-col gap-2 rounded-2xl bg-white/95 p-4 shadow-inner ${gridSpanClass}`}
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
                  {field.label}
                </span>
                <input
                  id={`basic-${field.key}`}
                  name={field.key}
                  type={getInputType(field)}
                  disabled={isPending}
                  value={getDisplayValue(value)}
                  onChange={(event) => handleFieldChange(field, event.target.value)}
                  className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm leading-relaxed text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
                />
              </label>
            );
          })}
        </div>
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-full bg-brand-teal px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#04a890] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </section>
  );
}

export function BasicDetailsPanelSkeleton() {
  return (
    <section className="flex animate-pulse flex-col gap-6 rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_24px_58px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="flex flex-col gap-2">
        <span className="h-3 w-28 rounded-full bg-brand-deep-soft/60" />
        <span className="h-6 w-48 rounded-full bg-brand-deep-soft/80" />
        <span className="h-3 w-64 max-w-full rounded-full bg-brand-deep-soft/50" />
      </div>
      <div className="flex flex-col gap-3">
        <span className="h-3 w-36 rounded-full bg-brand-deep-soft/50" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <span key={index} className="h-5 w-24 rounded-full bg-brand-deep-soft/40" />
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-3 rounded-2xl bg-white/95 p-4 shadow-inner">
            <span className="h-3 w-20 rounded-full bg-brand-deep-soft/50" />
            <span className="h-4 w-full rounded-full bg-brand-deep-soft/40" />
          </div>
        ))}
      </div>
    </section>
  );
}
