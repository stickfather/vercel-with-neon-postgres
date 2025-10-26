"use client";

import { useMemo, useState } from "react";

import type { StaffMemberRecord } from "@/features/staff/data/queries";
import { StaffSettingsPanel } from "@/features/staff/components/staff-settings-panel";
import type { PinScope } from "@/lib/security/pin-session";
import type { PinStatus } from "@/features/security/data/pins";
import { EphemeralToast } from "@/components/ui/ephemeral-toast";

type ConfigurationDashboardProps = {
  initialStaff: StaffMemberRecord[];
  staffError: string | null;
  pinStatuses: PinStatus[];
};

type PinFormState = {
  pin: string;
  confirmPin: string;
  managerPin: string;
};

type PinFormErrors = Partial<Record<keyof PinFormState, string>>;

const emptyForm: PinFormState = {
  pin: "",
  confirmPin: "",
  managerPin: "",
};

const tabs = [
  { id: "staff", label: "Personal" },
  { id: "security", label: "Contraseñas y seguridad" },
];

function formatDate(dateString: string | null): string {
  if (!dateString) return "Sin registro";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Sin registro";
  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function findStatus(statuses: PinStatus[], scope: PinScope): PinStatus {
  return (
    statuses.find((status) => status.scope === scope) ?? {
      scope,
      isSet: false,
      updatedAt: null,
    }
  );
}

export function ConfigurationDashboard({
  initialStaff,
  staffError,
  pinStatuses,
}: ConfigurationDashboardProps) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("staff");
  const [statuses, setStatuses] = useState(pinStatuses);
  const [forms, setForms] = useState<Record<PinScope, PinFormState>>({
    staff: { ...emptyForm },
    manager: { ...emptyForm },
  });
  const [fieldErrors, setFieldErrors] = useState<Record<PinScope, PinFormErrors>>({
    staff: {},
    manager: {},
  });
  const [loadingScope, setLoadingScope] = useState<PinScope | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(
    null,
  );

  const staffStatus = useMemo(
    () => findStatus(statuses, "staff"),
    [statuses],
  );
  const managerStatus = useMemo(
    () => findStatus(statuses, "manager"),
    [statuses],
  );

  const handleFormChange = (scope: PinScope, field: keyof PinFormState, value: string) => {
    const sanitized = value.replace(/[^\d]/g, "").slice(0, 4);
    setForms((previous) => ({
      ...previous,
      [scope]: { ...previous[scope], [field]: sanitized },
    }));
    setFieldErrors((previous) => ({
      ...previous,
      [scope]: { ...previous[scope], [field]: undefined },
    }));
    setError(null);
  };

  const submitPinUpdate = async (scope: PinScope) => {
    const form = forms[scope];
    const confirmation = form.confirmPin.trim();
    const pinValue = form.pin.trim();
    const managerConfirmation =
      scope === "staff" ? forms.staff.managerPin.trim() : form.managerPin.trim();

    setFieldErrors((previous) => ({
      ...previous,
      [scope]: {},
    }));

    if (!pinValue || pinValue.length !== 4) {
      setError("El PIN debe tener exactamente 4 dígitos numéricos.");
      return;
    }
    if (pinValue !== confirmation) {
      setFieldErrors((previous) => ({
        ...previous,
        [scope]: {
          ...previous[scope],
          confirmPin: "Los PIN ingresados no coinciden.",
        },
      }));
      return;
    }

    const requiresManagerVerification =
      scope === "staff" || (scope === "manager" && managerStatus.isSet);

    if (requiresManagerVerification && managerConfirmation.length !== 4) {
      setFieldErrors((previous) => ({
        ...previous,
        [scope]: {
          ...previous[scope],
          managerPin: "Debe tener exactamente 4 dígitos numéricos.",
        },
      }));
      return;
    }

    setLoadingScope(scope);
    setError(null);

    try {
      const payload =
        scope === "staff"
          ? {
              targetRole: "staff" as const,
              managerPin: managerConfirmation,
              newPin: pinValue,
            }
          : {
              targetRole: "manager" as const,
              newPin: pinValue,
              ...(managerStatus.isSet
                ? { currentManagerPin: managerConfirmation }
                : {}),
            };

      const updateResponse = await fetch("/api/admin/security/update-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseBody = (await updateResponse.json().catch(() => ({}))) as
        | { success?: boolean; error?: string; updatedAt?: string }
        | undefined;

      if (!updateResponse.ok || responseBody?.success !== true) {
        const message =
          responseBody?.error ?? "No se pudo actualizar el PIN solicitado.";

        const normalizedMessage = message.toLowerCase();

        if (scope === "staff" && normalizedMessage.includes("pin")) {
          setFieldErrors((previous) => ({
            ...previous,
            staff: {
              ...previous.staff,
              managerPin: "PIN incorrecto.",
            },
          }));
        } else if (scope === "manager" && normalizedMessage.includes("pin")) {
          setFieldErrors((previous) => ({
            ...previous,
            manager: {
              ...previous.manager,
              managerPin: "PIN incorrecto.",
            },
          }));
        } else {
          setError(message);
        }

        return;
      }

      const updatedAt =
        typeof responseBody?.updatedAt === "string"
          ? new Date(responseBody.updatedAt).toISOString()
          : new Date().toISOString();

      setStatuses((previous) =>
        previous.map((status) =>
          status.scope === scope
            ? { scope, isSet: true, updatedAt }
            : status,
        ),
      );

      setToast({
        tone: "success",
        message:
          scope === "staff"
            ? "PIN del personal actualizado."
            : "PIN de gerencia actualizado correctamente.",
      });
    } catch (err) {
      console.error(err);
      setToast({
        tone: "error",
        message:
          err instanceof Error
            ? err.message
            : "No logramos guardar el PIN. Inténtalo nuevamente.",
      });
    } finally {
      setLoadingScope(null);
      setForms((previous) => ({
        ...previous,
        [scope]: { ...emptyForm },
      }));
    }
  };

  const renderSecurityPanel = () => {
    const staffForm = forms.staff;
    const managerForm = forms.manager;
    const staffFieldErrors = fieldErrors.staff;
    const managerFieldErrors = fieldErrors.manager;

    return (
      <div className="flex flex-col gap-8">
        {toast ? (
          <EphemeralToast
            message={toast.message}
            tone={toast.tone}
            onDismiss={() => setToast(null)}
          />
        ) : null}
        {error && (
          <div className="rounded-3xl border border-brand-orange bg-white/85 px-4 py-3 text-sm font-medium text-brand-ink">
            {error}
          </div>
        )}
        <section className="rounded-[32px] border border-white/70 bg-white/95 px-8 py-7 shadow-[0_22px_56px_rgba(15,23,42,0.12)]">
          <header className="mb-5 flex flex-col gap-1 text-left">
            <h2 className="text-xl font-black text-brand-deep">PIN del personal</h2>
            <p className="text-sm text-brand-ink-muted">
              {staffStatus.isSet
                ? `Última actualización: ${formatDate(staffStatus.updatedAt)}`
                : "Aún no se ha configurado un PIN para el personal."}
            </p>
          </header>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm font-semibold uppercase tracking-wide text-brand-deep">
              Nuevo PIN
              <input
                type="password"
                inputMode="numeric"
                value={staffForm.pin}
                onChange={(event) => handleFormChange("staff", "pin", event.target.value)}
                className="rounded-3xl border border-brand-teal-soft bg-white px-5 py-3 text-base shadow-inner focus:border-brand-teal"
                maxLength={4}
                pattern="\d{4}"
                placeholder="••••"
              />
              <span className="text-xs font-medium text-brand-ink-muted">
                Debe tener exactamente 4 dígitos numéricos.
              </span>
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold uppercase tracking-wide text-brand-deep">
              Confirmar PIN
              <input
                type="password"
                inputMode="numeric"
                value={staffForm.confirmPin}
                onChange={(event) => handleFormChange("staff", "confirmPin", event.target.value)}
                className="rounded-3xl border border-brand-teal-soft bg-white px-5 py-3 text-base shadow-inner focus:border-brand-teal"
                maxLength={4}
                pattern="\d{4}"
              />
              {staffFieldErrors.confirmPin ? (
                <span className="text-xs font-medium text-red-600">
                  {staffFieldErrors.confirmPin}
                </span>
              ) : null}
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold uppercase tracking-wide text-brand-deep">
              PIN de gerencia
              <input
                type="password"
                inputMode="numeric"
                value={staffForm.managerPin}
                onChange={(event) => handleFormChange("staff", "managerPin", event.target.value)}
                className="rounded-3xl border border-brand-teal-soft bg-white px-5 py-3 text-base shadow-inner focus:border-brand-teal"
                maxLength={4}
                pattern="\d{4}"
                required
              />
              {staffFieldErrors.managerPin ? (
                <span className="text-xs font-medium text-red-600">
                  {staffFieldErrors.managerPin}
                </span>
              ) : null}
              <span className="text-xs font-medium text-brand-ink-muted">
                Debe tener exactamente 4 dígitos numéricos.
              </span>
            </label>
          </div>
          <button
            type="button"
            onClick={() => submitPinUpdate("staff")}
            disabled={loadingScope === "staff"}
            className="cta-ripple mt-4 inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loadingScope === "staff" ? "Guardando…" : "Actualizar PIN del personal"}
          </button>
        </section>

        <section className="rounded-[32px] border border-white/70 bg-white/95 px-8 py-7 shadow-[0_22px_56px_rgba(15,23,42,0.12)]">
          <header className="mb-5 flex flex-col gap-1 text-left">
            <h2 className="text-xl font-black text-brand-deep">PIN de gerencia</h2>
            <p className="text-sm text-brand-ink-muted">
              {managerStatus.isSet
                ? `Última actualización: ${formatDate(managerStatus.updatedAt)}`
                : "Configura un PIN maestro para controlar accesos sensibles."}
            </p>
          </header>
          <div className="grid gap-3 sm:grid-cols-3">
            {managerStatus.isSet && (
              <label className="flex flex-col gap-2 text-sm font-semibold uppercase tracking-wide text-brand-deep">
                PIN actual
                <input
                  type="password"
                  inputMode="numeric"
                  value={managerForm.managerPin}
                  onChange={(event) =>
                    handleFormChange("manager", "managerPin", event.target.value)
                  }
                  className="rounded-3xl border border-brand-teal-soft bg-white px-5 py-3 text-base shadow-inner focus:border-brand-teal"
                  maxLength={4}
                  pattern="\d{4}"
                  required
                />
                {managerFieldErrors.managerPin ? (
                  <span className="text-xs font-medium text-red-600">
                    {managerFieldErrors.managerPin}
                  </span>
                ) : null}
                <span className="text-xs font-medium text-brand-ink-muted">
                  Debe tener exactamente 4 dígitos numéricos.
                </span>
              </label>
            )}
            <label className="flex flex-col gap-2 text-sm font-semibold uppercase tracking-wide text-brand-deep">
              Nuevo PIN
              <input
                type="password"
                inputMode="numeric"
                value={managerForm.pin}
                onChange={(event) => handleFormChange("manager", "pin", event.target.value)}
                className="rounded-3xl border border-brand-teal-soft bg-white px-5 py-3 text-base shadow-inner focus:border-brand-teal"
                maxLength={4}
                pattern="\d{4}"
                required
              />
              <span className="text-xs font-medium text-brand-ink-muted">
                Debe tener exactamente 4 dígitos numéricos.
              </span>
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold uppercase tracking-wide text-brand-deep">
              Confirmar PIN
              <input
                type="password"
                inputMode="numeric"
                value={managerForm.confirmPin}
                onChange={(event) =>
                  handleFormChange("manager", "confirmPin", event.target.value)
                }
                className="rounded-3xl border border-brand-teal-soft bg-white px-5 py-3 text-base shadow-inner focus:border-brand-teal"
                maxLength={4}
                pattern="\d{4}"
                required
              />
              {managerFieldErrors.confirmPin ? (
                <span className="text-xs font-medium text-red-600">
                  {managerFieldErrors.confirmPin}
                </span>
              ) : null}
            </label>
          </div>
          <button
            type="button"
            onClick={() => submitPinUpdate("manager")}
            disabled={loadingScope === "manager"}
            className="cta-ripple mt-4 inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition hover:-translate-y-[1px] hover:bg-[#ff7832] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loadingScope === "manager" ? "Guardando…" : "ACTUALIZAR PIN DE GERENCIA"}
          </button>
        </section>

        <section className="rounded-[24px] border border-brand-ink-muted/15 bg-white/95 px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.12)]">
          <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-ink-muted">Responsabilidades de PIN</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-brand-ink-muted/10 bg-brand-teal-soft/15 px-4 py-3">
              <h3 className="text-base font-semibold text-brand-deep">PIN del personal</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-brand-ink">
                <li>Permite acceder a Administración para consultas y tareas no sensibles.</li>
                <li>No autoriza aprobar días de nómina ni modificar sesiones.</li>
                <li>No puede administrar la seguridad ni actualizar los PIN.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-brand-ink-muted/10 bg-brand-orange/10 px-4 py-3">
              <h3 className="text-base font-semibold text-brand-deep">PIN de gerencia</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-brand-ink">
                <li>Aprueba días de nómina y gestiona sesiones (editar, agregar, eliminar).</li>
                <li>Actualiza los PIN desde este panel de “Contraseñas y seguridad”.</li>
                <li>No muestra PIN en texto plano ni evita el registro de auditoría.</li>
              </ul>
            </div>
          </div>
          <p className="mt-3 text-sm text-brand-ink-muted">
            Cada verificación se valida en el servidor sin almacenar sesiones persistentes, por lo que deberás ingresar el PIN en cada visita.
          </p>
        </section>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <nav className="flex flex-wrap gap-3">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full border px-5 py-2 text-sm font-semibold uppercase tracking-wide transition ${
                isActive
                  ? "border-brand-teal bg-brand-teal text-white shadow"
                  : "border-transparent bg-white text-brand-deep shadow"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {activeTab === "staff" ? (
        <StaffSettingsPanel initialStaff={initialStaff} initialError={staffError} />
      ) : (
        renderSecurityPanel()
      )}
    </div>
  );
}
