"use client";

import { useMemo, useState, useTransition } from "react";
import type { BasicDetailField, StudentBasicDetails } from "@/features/administration/data/student-profile";

type Props = {
  studentId: number;
  details: StudentBasicDetails | null;
  onUpdated?: () => void;
};

type FieldState = BasicDetailField;

function getInputType(field: BasicDetailField) {
  switch (field.type) {
    case "date":
      return "date";
    case "number":
      return "number";
    default:
      return "text";
  }
}

export function BasicDetailsPanel({ studentId, details, onUpdated }: Props) {
  const [fields, setFields] = useState<FieldState[]>(details?.fields ?? []);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasData = useMemo(() => fields.length > 0, [fields.length]);

  const handleSubmit = (field: FieldState, rawValue: string) => {
    if (!field.editable) return;
    const nextValue = rawValue.trim().length ? rawValue : null;
    setError(null);
    setStatusMessage(null);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/students/${studentId}/basic-details`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ field: field.key, value: nextValue }),
          });

          const payload = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(payload?.error ?? "No se pudo guardar el cambio.");
          }

          setFields((previous) =>
            previous.map((item) =>
              item.key === field.key
                ? {
                    ...item,
                    value: nextValue,
                  }
                : item,
            ),
          );
          setStatusMessage("Cambios guardados correctamente.");
          onUpdated?.();
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo guardar el cambio. Inténtalo nuevamente.",
          );
        }
      })();
    });
  };

  if (!details) {
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
      {!hasData ? (
        <p className="text-sm text-brand-ink-muted">
          No hay campos configurados para este estudiante. Verifica la estructura de la tabla <code className="rounded bg-brand-deep-soft px-1.5 py-0.5 text-[11px]">public.students</code>.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((field) => {
            const inputType = getInputType(field);
            const pending = isPending;
            const value = field.value ?? "";

            if (!field.editable) {
              return (
                <div key={field.key} className="flex flex-col gap-1 rounded-2xl bg-white/95 p-4 shadow-inner">
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">{field.label}</span>
                  <span className="text-sm font-semibold text-brand-deep">
                    {value || "Sin registrar"}
                  </span>
                </div>
              );
            }

            return (
              <form
                key={field.key}
                className="flex flex-col gap-2 rounded-2xl bg-white/95 p-4 shadow-inner"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  const formValue = String(formData.get("value") ?? "");
                  handleSubmit(field, formValue);
                }}
              >
                <label className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted" htmlFor={`basic-${field.key}`}>
                  {field.label}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    id={`basic-${field.key}`}
                    name="value"
                    defaultValue={value}
                    rows={4}
                    className="w-full rounded-2xl border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
                  />
                ) : (
                  <input
                    id={`basic-${field.key}`}
                    name="value"
                    defaultValue={value}
                    type={inputType}
                    className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
                  />
                )}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="submit"
                    disabled={pending}
                    className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#04a890] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pending ? "Guardando…" : "Guardar"}
                  </button>
                </div>
              </form>
            );
          })}
        </div>
      )}
    </section>
  );
}
