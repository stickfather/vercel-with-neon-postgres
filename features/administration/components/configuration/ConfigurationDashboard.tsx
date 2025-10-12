"use client";

import { useMemo, useState } from "react";

import type { StaffMemberRecord } from "@/features/staff/data/queries";
import { StaffSettingsPanel } from "@/features/staff/components/staff-settings-panel";
import type { PinScope } from "@/lib/security/pin-session";
import type { PinStatus } from "@/features/security/data/pins";
import { PinPrompt } from "@/features/security/components/PinPrompt";
import { EphemeralToast } from "@/components/ui/ephemeral-toast";

type ConfigurationDashboardProps = {
  initialStaff: StaffMemberRecord[];
  staffError: string | null;
  pinStatuses: PinStatus[];
  hasManagementSession: boolean;
};

type PinFormState = {
  pin: string;
  confirmPin: string;
  managerPin: string;
};

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
  hasManagementSession,
}: ConfigurationDashboardProps) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("staff");
  const [statuses, setStatuses] = useState(pinStatuses);
  const [forms, setForms] = useState<Record<PinScope, PinFormState>>({
    staff: { ...emptyForm },
    management: { ...emptyForm },
  });
  const [loadingScope, setLoadingScope] = useState<PinScope | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(
    null,
  );
  const [managementUnlocked, setManagementUnlocked] = useState(hasManagementSession);

  const staffStatus = useMemo(
    () => findStatus(statuses, "staff"),
    [statuses],
  );
  const managementStatus = useMemo(
    () => findStatus(statuses, "management"),
    [statuses],
  );

  const handleFormChange = (scope: PinScope, field: keyof PinFormState, value: string) => {
    setForms((previous) => ({
      ...previous,
      [scope]: { ...previous[scope], [field]: value.replace(/[^\d]/g, "") },
    }));
  };

  const submitPinUpdate = async (scope: PinScope) => {
    const form = forms[scope];
    const confirmation = form.confirmPin.trim();
    const pinValue = form.pin.trim();
    const managerConfirmation =
      scope === "staff" ? forms.staff.managerPin.trim() : form.managerPin.trim();

    if (!pinValue || pinValue.length < 4) {
      setError("El PIN debe tener al menos 4 dígitos.");
      return;
    }
    if (pinValue !== confirmation) {
      setError("Los PIN ingresados no coinciden.");
      return;
    }
    if (scope === "staff" && !managerConfirmation) {
      setError("Ingresa el PIN de gerencia para actualizar el acceso del personal.");
      return;
    }
    if (scope === "management" && managementStatus.isSet && !managerConfirmation) {
      setError("Ingresa el PIN de gerencia actual para cambiarlo.");
      return;
    }

    setLoadingScope(scope);
    setError(null);

    try {
      const response = await fetch("/api/(administration)/security-pins/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          pin: pinValue,
          managerPin: managerConfirmation || undefined,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo actualizar el PIN.");
      }

      if (payload?.status) {
        setStatuses((previous) => {
          const other = previous.filter((status) => status.scope !== scope);
          return [...other, payload.status as PinStatus];
        });
      }

      setForms((previous) => ({
        staff:
          scope === "staff"
            ? { ...emptyForm }
            : { ...previous.staff, managerPin: "" },
        management:
          scope === "management"
            ? { ...emptyForm }
            : { ...previous.management, managerPin: "" },
      }));

      if (scope === "management") {
        setManagementUnlocked(true);
      }

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
    }
  };

  const renderSecurityPanel = () => {
    if (!managementUnlocked) {
      return (
        <div className="flex flex-col items-center justify-center gap-6">
          <PinPrompt
            scope="management"
            title="Protegido con PIN de gerencia"
            description="Ingresa el PIN de gerencia para gestionar los accesos de seguridad."
            ctaLabel="Desbloquear"
            onSuccess={() => setManagementUnlocked(true)}
          />
        </div>
      );
    }

    const staffForm = forms.staff;
    const managementForm = forms.management;

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
                maxLength={8}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold uppercase tracking-wide text-brand-deep">
              Confirmar PIN
              <input
                type="password"
                inputMode="numeric"
                value={staffForm.confirmPin}
                onChange={(event) => handleFormChange("staff", "confirmPin", event.target.value)}
                className="rounded-3xl border border-brand-teal-soft bg-white px-5 py-3 text-base shadow-inner focus:border-brand-teal"
                maxLength={8}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold uppercase tracking-wide text-brand-deep">
              PIN de gerencia
              <input
                type="password"
                inputMode="numeric"
                value={staffForm.managerPin}
                onChange={(event) => handleFormChange("staff", "managerPin", event.target.value)}
                className="rounded-3xl border border-brand-teal-soft bg-white px-5 py-3 text-base shadow-inner focus:border-brand-teal"
                maxLength={8}
                required
              />
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
              {managementStatus.isSet
                ? `Última actualización: ${formatDate(managementStatus.updatedAt)}`
                : "Configura un PIN maestro para controlar accesos sensibles."}
            </p>
          </header>
          <div className="grid gap-3 sm:grid-cols-3">
            {managementStatus.isSet && (
              <label className="flex flex-col gap-2 text-sm font-semibold uppercase tracking-wide text-brand-deep">
                PIN actual
                <input
                  type="password"
                  inputMode="numeric"
                  value={managementForm.managerPin}
                  onChange={(event) =>
                    handleFormChange("management", "managerPin", event.target.value)
                  }
                  className="rounded-3xl border border-brand-teal-soft bg-white px-5 py-3 text-base shadow-inner focus:border-brand-teal"
                  maxLength={8}
                  required
                />
              </label>
            )}
            <label className="flex flex-col gap-2 text-sm font-semibold uppercase tracking-wide text-brand-deep">
              Nuevo PIN
              <input
                type="password"
                inputMode="numeric"
                value={managementForm.pin}
                onChange={(event) => handleFormChange("management", "pin", event.target.value)}
                className="rounded-3xl border border-brand-teal-soft bg-white px-5 py-3 text-base shadow-inner focus:border-brand-teal"
                maxLength={8}
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold uppercase tracking-wide text-brand-deep">
              Confirmar PIN
              <input
                type="password"
                inputMode="numeric"
                value={managementForm.confirmPin}
                onChange={(event) =>
                  handleFormChange("management", "confirmPin", event.target.value)
                }
                className="rounded-3xl border border-brand-teal-soft bg-white px-5 py-3 text-base shadow-inner focus:border-brand-teal"
                maxLength={8}
                required
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => submitPinUpdate("management")}
            disabled={loadingScope === "management"}
            className="cta-ripple mt-4 inline-flex items-center justify-center rounded-full bg-brand-deep px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loadingScope === "management" ? "Guardando…" : "Actualizar PIN de gerencia"}
          </button>
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
