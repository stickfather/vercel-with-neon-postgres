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
            `/api/(administration)/students/${studentId}/basic-details`,
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

          setFormState(data as StudentBasicDetails);
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
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-deep">Panel 1</span>
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
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          {STUDENT_BASIC_DETAIL_FIELDS.map((field) => {
            const value = (formState as Record<string, unknown>)[field.key] ?? null;

            if (!field.editable) {
              return (
                <div key={field.key} className="flex flex-col gap-1 rounded-2xl bg-white/95 p-4 shadow-inner">
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
                  className="flex flex-col gap-3 rounded-2xl bg-white/95 p-4 shadow-inner"
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
                  className="flex flex-col gap-2 rounded-2xl bg-white/95 p-4 shadow-inner"
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
                className="flex flex-col gap-2 rounded-2xl bg-white/95 p-4 shadow-inner"
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
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-3 rounded-2xl bg-white/95 p-4 shadow-inner">
            <span className="h-3 w-20 rounded-full bg-brand-deep-soft/50" />
            <span className="h-4 w-full rounded-full bg-brand-deep-soft/40" />
          </div>
        ))}
      </div>
    </section>
  );
}
