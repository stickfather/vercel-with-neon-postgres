"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DateInput } from "@/components/ui/date-input";
import { EphemeralToast } from "@/components/ui/ephemeral-toast";
import { getStudentStatusDisplay } from "@/features/administration/constants/student-status";
import type { StudentBasicDetails } from "@/features/administration/data/student-profile";

import { queueableFetch } from "@/lib/offline/fetch";

const FLAG_VALUE_KEYS: Record<
  keyof Pick<
    StudentBasicDetails,
    | "isNewStudent"
    | "isExamPreparation"
    | "hasSpecialNeeds"
    | "isAbsent7d"
    | "isAbsent7Days"
    | "isSlowProgress14d"
    | "isSlowProgress14Days"
    | "instructivoActive"
    | "hasActiveInstructive"
    | "instructivoOverdue"
    | "hasOverdueInstructive"
  >,
  Array<keyof StudentBasicDetails>
> = {
  isNewStudent: ["isNewStudent"],
  isExamPreparation: ["isExamPreparation"],
  hasSpecialNeeds: ["hasSpecialNeeds"],
  isAbsent7d: ["isAbsent7d", "isAbsent7Days"],
  isAbsent7Days: ["isAbsent7Days", "isAbsent7d"],
  isSlowProgress14d: ["isSlowProgress14d", "isSlowProgress14Days"],
  isSlowProgress14Days: ["isSlowProgress14Days", "isSlowProgress14d"],
  instructivoActive: ["instructivoActive", "hasActiveInstructive"],
  hasActiveInstructive: ["hasActiveInstructive", "instructivoActive"],
  instructivoOverdue: ["instructivoOverdue", "hasOverdueInstructive"],
  hasOverdueInstructive: ["hasOverdueInstructive", "instructivoOverdue"],
};

const FLAG_DEFINITIONS: ReadonlyArray<{
  key: keyof typeof FLAG_VALUE_KEYS;
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

type Props = {
  studentId: number;
  details: StudentBasicDetails | null;
};

type FormState = {
  fullName: string;
  representativeName: string;
  representativePhone: string;
  representativeEmail: string;
  hasSpecialNeeds: boolean;
  isOnline: boolean;
  contractStart: string;
  contractEnd: string;
  frozenStart: string;
  frozenEnd: string;
  plannedLevelMin: string;
  plannedLevelMax: string;
};

type ToastState = {
  tone: "success" | "error";
  message: string;
};

type ActionType = "terminate" | "graduate";

type ActionState = {
  type: ActionType;
  date: string;
  loading: boolean;
  error: string | null;
};

function formatIsoDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  return value;
}

function sanitizeText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function sanitizeDate(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function createFormState(details: StudentBasicDetails | null): FormState {
  return {
    fullName: details?.fullName ?? "",
    representativeName: details?.representativeName ?? "",
    representativePhone: details?.representativePhone ?? "",
    representativeEmail: details?.representativeEmail ?? "",
    hasSpecialNeeds: Boolean(details?.hasSpecialNeeds ?? false),
    isOnline: Boolean(details?.isOnline ?? false),
    contractStart: details?.contractStart ?? "",
    contractEnd: details?.contractEnd ?? "",
    frozenStart: details?.frozenStart ?? "",
    frozenEnd: details?.frozenEnd ?? "",
    plannedLevelMin: details?.plannedLevelMin ?? "",
    plannedLevelMax: details?.plannedLevelMax ?? "",
  };
}

type ActionDialogProps = {
  state: ActionState | null;
  onCancel: () => void;
  onDateChange: (value: string) => void;
  onConfirm: () => void;
};

function ActionDialog({ state, onCancel, onDateChange, onConfirm }: ActionDialogProps) {
  if (!state) {
    return null;
  }

  const isGraduate = state.type === "graduate";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-[0_24px_58px_rgba(15,23,42,0.18)]">
        <h2 className="text-lg font-semibold text-brand-deep">
          {isGraduate ? "¿Marcar este estudiante como graduado/a?" : "¿Terminar este contrato?"}
        </h2>
        <p className="mt-2 text-sm text-brand-ink-muted">
          {isGraduate
            ? "Confirma la graduación de este estudiante."
            : "¿Estás seguro/a de que quieres terminar este contrato?"}
        </p>
        <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-brand-deep" htmlFor="action-date">
          {isGraduate ? "Fecha de graduación" : "Fecha de finalización"}
          <DateInput
            id="action-date"
            value={state.date}
            onChange={(event) => onDateChange(event.target.value)}
            disabled={state.loading}
          />
        </label>
        {state.error ? (
          <p className="mt-2 text-sm font-medium text-rose-600">{state.error}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={state.loading}
            className="inline-flex items-center justify-center rounded-full border border-brand-ink-muted/30 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-ink transition hover:-translate-y-[1px] hover:border-brand-teal hover:text-brand-teal disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={state.loading || !state.date.trim().length}
            className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 ${
              isGraduate
                ? "bg-brand-teal hover:bg-[#04a890] focus-visible:outline-[#00bfa6]"
                : "bg-brand-orange hover:bg-[#ff7832] focus-visible:outline-[#ff7832]"
            } ${state.loading || !state.date.trim().length ? "disabled:cursor-not-allowed disabled:opacity-60" : ""}`}
          >
            {state.loading ? "Guardando…" : isGraduate ? "Graduar" : "Terminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function BasicDetailsPanel({ studentId, details }: Props) {
  const router = useRouter();
  const [currentDetails, setCurrentDetails] = useState<StudentBasicDetails | null>(details);
  const [formState, setFormState] = useState<FormState>(() => createFormState(details));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [actionState, setActionState] = useState<ActionState | null>(null);

  useEffect(() => {
    setCurrentDetails(details);
    setFormState(createFormState(details));
  }, [details]);

  const statusDisplay = useMemo(() => {
    const display = getStudentStatusDisplay(currentDetails?.status ?? null);
    const dateSource = display.showEndDate
      ? display.dateField === "graduationDate"
        ? currentDetails?.graduationDate ?? null
        : currentDetails?.contractEnd ?? null
      : null;
    return {
      ...display,
      formattedDate: formatIsoDate(dateSource),
    };
  }, [currentDetails?.contractEnd, currentDetails?.graduationDate, currentDetails?.status]);

  const flagBadges = useMemo(() => {
    if (!currentDetails) {
      return [] as Array<{ key: string; label: string; className: string; dotClass: string }>;
    }

    return FLAG_DEFINITIONS.filter((flag) => {
      const candidates = FLAG_VALUE_KEYS[flag.key] ?? [];
      return candidates.some((candidate) => Boolean((currentDetails as Record<string, unknown>)[candidate]));
    }).map((flag) => ({
      key: flag.key,
      label: flag.label,
      className: flag.className,
      dotClass: flag.dotClass,
    }));
  }, [currentDetails]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentDetails || isSaving) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setToast(null);

    const payload = {
      fullName: sanitizeText(formState.fullName),
      representativeName: sanitizeText(formState.representativeName),
      representativePhone: sanitizeText(formState.representativePhone),
      representativeEmail: sanitizeText(formState.representativeEmail),
      hasSpecialNeeds: formState.hasSpecialNeeds,
      isOnline: formState.isOnline,
      contractStart: sanitizeDate(formState.contractStart),
      contractEnd: sanitizeDate(formState.contractEnd),
      frozenStart: sanitizeDate(formState.frozenStart),
      frozenEnd: sanitizeDate(formState.frozenEnd),
      plannedLevelMin: sanitizeText(formState.plannedLevelMin),
      plannedLevelMax: sanitizeText(formState.plannedLevelMax),
    };

    try {
      const response = await fetch(`/api/(administration)/students/${studentId}/basic-details`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "No se pudo guardar la información.",
        );
      }

      const updated = data as StudentBasicDetails;
      setCurrentDetails(updated);
      setFormState(createFormState(updated));
      setToast({ tone: "success", message: "Cambios guardados correctamente." });
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo guardar la información. Inténtalo nuevamente.";
      setError(message);
      setToast({ tone: "error", message });
    } finally {
      setIsSaving(false);
    }
  };

  const openActionDialog = (type: ActionType) => {
    if (!currentDetails) {
      return;
    }
    const defaultDate =
      type === "graduate"
        ? currentDetails.graduationDate ?? currentDetails.contractEnd ?? ""
        : currentDetails.contractEnd ?? "";
    setActionState({ type, date: defaultDate ?? "", loading: false, error: null });
  };

  const handleActionDateChange = (value: string) => {
    setActionState((previous) => (previous ? { ...previous, date: value, error: null } : previous));
  };

  const handleActionSubmit = async () => {
    if (!actionState) {
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(actionState.date)) {
      setActionState((previous) =>
        previous
          ? {
              ...previous,
              error: "Selecciona una fecha válida.",
            }
          : previous,
      );
      return;
    }

    setActionState((previous) => (previous ? { ...previous, loading: true, error: null } : previous));

    const payload =
      actionState.type === "graduate"
        ? {
            graduation_date: actionState.date,
            contract_end: actionState.date,
            archived: true,
          }
        : {
            contract_end: actionState.date,
            graduation_date: null,
            archived: true,
          };

    try {
      const response = await queueableFetch(`/api/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "No se pudo actualizar el estado del estudiante.",
        );
      }

      setCurrentDetails((previous) => {
        if (!previous) {
          return previous;
        }
        const nextContractEnd =
          typeof data?.contract_end === "string"
            ? data.contract_end
            : (payload.contract_end as string | null | undefined) ?? previous.contractEnd;
        const nextGraduationDate =
          typeof data?.graduation_date === "string"
            ? data.graduation_date
            : payload.graduation_date ?? (actionState.type === "graduate" ? payload.contract_end ?? null : null);
        return {
          ...previous,
          contractEnd: nextContractEnd ?? null,
          graduationDate: nextGraduationDate ?? null,
          status: typeof data?.status === "string" ? data.status : previous.status,
          archived:
            typeof data?.archived === "boolean"
              ? data.archived
              : previous.archived ?? true,
        };
      });

      setFormState((previous) => ({
        ...previous,
        contractEnd: payload.contract_end ?? previous.contractEnd,
      }));

      setToast({
        tone: actionState.type === "graduate" ? "success" : "error",
        message:
          actionState.type === "graduate"
            ? "✅ Estudiante graduado correctamente."
            : "⚠️ Contrato terminado correctamente.",
      });

      setActionState(null);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el estado del estudiante.";
      setActionState((previous) => (previous ? { ...previous, loading: false, error: message } : previous));
    }
  };

  if (!currentDetails) {
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
        <h2 className="text-2xl font-bold text-brand-deep">Datos básicos</h2>
        <p className="text-sm text-brand-ink-muted">
          Actualiza la información de contacto y administra las fechas clave del estudiante.
        </p>
      </header>
      {error ? (
        <p className="rounded-3xl border border-brand-orange bg-white/85 px-4 py-3 text-sm font-medium text-brand-ink">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
          Estado y banderas
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${statusDisplay.badgeClassName}`}
          >
            {statusDisplay.label}
          </span>
          {statusDisplay.formattedDate ? (
            <span className="inline-flex items-center rounded-full bg-brand-ink-muted/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-ink">
              {(statusDisplay.endDateLabel ?? "Fecha") + ": "}
              {statusDisplay.formattedDate}
            </span>
          ) : null}
          {flagBadges.length ? (
            flagBadges.map((badge) => (
              <span
                key={`flag-${badge.key}`}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${badge.className}`}
              >
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${badge.dotClass}`} />
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
      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm font-medium text-brand-deep">
            Nombre completo
            <input
              type="text"
              value={formState.fullName}
              onChange={(event) =>
                setFormState((previous) => ({ ...previous, fullName: event.target.value }))
              }
              className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm leading-relaxed text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-brand-deep">
            Nombre del representante
            <input
              type="text"
              value={formState.representativeName}
              onChange={(event) =>
                setFormState((previous) => ({ ...previous, representativeName: event.target.value }))
              }
              className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm leading-relaxed text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-brand-deep">
            Teléfono del representante
            <input
              type="text"
              value={formState.representativePhone}
              onChange={(event) =>
                setFormState((previous) => ({ ...previous, representativePhone: event.target.value }))
              }
              className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm leading-relaxed text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm font-medium text-brand-deep">
            Correo del representante
            <input
              type="email"
              value={formState.representativeEmail}
              onChange={(event) =>
                setFormState((previous) => ({ ...previous, representativeEmail: event.target.value }))
              }
              className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm leading-relaxed text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
            />
          </label>
          <label className="flex flex-col gap-3 rounded-2xl bg-white/95 p-4 shadow-inner text-sm font-medium text-brand-deep">
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
              Necesidades especiales
            </span>
            <span className="flex items-center gap-2 text-sm text-brand-ink">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-brand-deep-soft/40 text-brand-teal focus:ring-brand-teal"
                checked={formState.hasSpecialNeeds}
                onChange={(event) =>
                  setFormState((previous) => ({ ...previous, hasSpecialNeeds: event.target.checked }))
                }
              />
              <span>{formState.hasSpecialNeeds ? "Sí" : "No"}</span>
            </span>
          </label>
          <label className="flex flex-col gap-3 rounded-2xl bg-white/95 p-4 shadow-inner text-sm font-medium text-brand-deep">
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
              Modalidad en línea
            </span>
            <span className="flex items-center gap-2 text-sm text-brand-ink">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-brand-deep-soft/40 text-brand-teal focus:ring-brand-teal"
                checked={formState.isOnline}
                onChange={(event) =>
                  setFormState((previous) => ({ ...previous, isOnline: event.target.checked }))
                }
              />
              <span>{formState.isOnline ? "Sí" : "No"}</span>
            </span>
          </label>
        </div>
        <div className="my-2 h-px w-full bg-brand-ink-muted/20" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-2 text-sm font-medium text-brand-deep">
            Inicio de contrato
            <DateInput
              value={formState.contractStart}
              onChange={(event) =>
                setFormState((previous) => ({ ...previous, contractStart: event.target.value }))
              }
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-brand-deep">
            Fin de contrato
            <DateInput
              value={formState.contractEnd}
              onChange={(event) =>
                setFormState((previous) => ({ ...previous, contractEnd: event.target.value }))
              }
            />
          </label>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">
              Acciones rápidas
            </span>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => openActionDialog("terminate")}
                className="inline-flex items-center justify-center rounded-full bg-brand-orange px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#ff7832] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#ff7832]"
              >
                Terminar contrato
              </button>
              <button
                type="button"
                onClick={() => openActionDialog("graduate")}
                className="inline-flex items-center justify-center rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#04a890] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
              >
                Graduar
              </button>
            </div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-brand-deep">
            Inicio de congelamiento
            <DateInput
              value={formState.frozenStart}
              onChange={(event) =>
                setFormState((previous) => ({ ...previous, frozenStart: event.target.value }))
              }
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-brand-deep">
            Fin de congelamiento
            <DateInput
              value={formState.frozenEnd}
              onChange={(event) =>
                setFormState((previous) => ({ ...previous, frozenEnd: event.target.value }))
              }
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-brand-deep">
            Nivel planificado mínimo
            <input
              type="text"
              value={formState.plannedLevelMin}
              onChange={(event) =>
                setFormState((previous) => ({ ...previous, plannedLevelMin: event.target.value }))
              }
              className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm leading-relaxed text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-brand-deep">
            Nivel planificado máximo
            <input
              type="text"
              value={formState.plannedLevelMax}
              onChange={(event) =>
                setFormState((previous) => ({ ...previous, plannedLevelMax: event.target.value }))
              }
              className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm leading-relaxed text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
            />
          </label>
        </div>
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center justify-center rounded-full bg-brand-teal px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#04a890] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
      {toast ? (
        <EphemeralToast
          message={toast.message}
          tone={toast.tone}
          onDismiss={() => setToast(null)}
        />
      ) : null}
      <ActionDialog
        state={actionState}
        onCancel={() => setActionState(null)}
        onDateChange={handleActionDateChange}
        onConfirm={handleActionSubmit}
      />
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
          {Array.from({ length: 4 }).map((_, index) => (
            <span key={index} className="h-5 w-24 rounded-full bg-brand-deep-soft/40" />
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-3 rounded-2xl bg-white/95 p-4 shadow-inner">
            <span className="h-3 w-20 rounded-full bg-brand-deep-soft/50" />
            <span className="h-4 w-full rounded-full bg-brand-deep-soft/40" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-3 rounded-2xl bg-white/95 p-4 shadow-inner">
            <span className="h-3 w-24 rounded-full bg-brand-deep-soft/40" />
            <span className="h-4 w-full rounded-full bg-brand-deep-soft/30" />
          </div>
        ))}
      </div>
      <div className="h-px w-full bg-brand-deep-soft/30" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-3 rounded-2xl bg-white/95 p-4 shadow-inner">
            <span className="h-3 w-24 rounded-full bg-brand-deep-soft/40" />
            <span className="h-4 w-full rounded-full bg-brand-deep-soft/30" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-3 rounded-2xl bg-white/95 p-4 shadow-inner">
            <span className="h-3 w-24 rounded-full bg-brand-deep-soft/40" />
            <span className="h-4 w-full rounded-full bg-brand-deep-soft/30" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-3 rounded-2xl bg-white/95 p-4 shadow-inner">
            <span className="h-3 w-24 rounded-full bg-brand-deep-soft/40" />
            <span className="h-4 w-full rounded-full bg-brand-deep-soft/30" />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <span className="h-8 w-40 rounded-full bg-brand-deep-soft/40" />
      </div>
    </section>
  );
}
