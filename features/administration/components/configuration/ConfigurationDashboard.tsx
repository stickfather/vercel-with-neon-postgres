"use client";

import { useEffect, useMemo, useState } from "react";

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
  hasManagerSession: boolean;
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
  hasManagerSession,
}: ConfigurationDashboardProps) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("staff");
  const [statuses, setStatuses] = useState(pinStatuses);
  const [forms, setForms] = useState<Record<PinScope, PinFormState>>({
    staff: { ...emptyForm },
    manager: { ...emptyForm },
  });
  const [loadingScope, setLoadingScope] = useState<PinScope | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(
    null,
  );
  const [managerUnlocked, setManagerUnlocked] = useState(hasManagerSession);

  const staffStatus = useMemo(
    () => findStatus(statuses, "staff"),
    [statuses],
  );
  const managerStatus = useMemo(
    () => findStatus(statuses, "manager"),
    [statuses],
  );

  useEffect(() => {
    if (!managerStatus.isSet && !managerUnlocked) {
      setManagerUnlocked(true);
    }
  }, [managerStatus.isSet, managerUnlocked]);

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

    const requiresManagerVerification =
      scope === "staff" || (scope === "manager" && managerStatus.isSet);

    if (requiresManagerVerification && !managerConfirmation) {
      setError("Ingresa el PIN de gerencia para continuar.");
      return;
    }

    setLoadingScope(scope);
    setError(null);

    try {
      if (requiresManagerVerification && managerConfirmation) {
        const verifyResponse = await fetch("/api/security/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "manager", pin: managerConfirmation }),
        });

        const verifyPayload = await verifyResponse.json().catch(() => ({}));
        if (!verifyResponse.ok || verifyPayload?.valid !== true) {
          throw new Error(
            verifyPayload?.error ?? "El PIN de gerencia no es correcto.",
          );
        }
      }

      const body: Record<string, string> = {};
      if (scope === "staff") {
        body.staffPin = pinValue;
      } else {
        body.managerPin = pinValue;
      }

      const updateResponse = await fetch("/api/security/pins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!updateResponse.ok) {
        const payload = await updateResponse.json().catch(() => ({}));
        throw new Error(payload?.error ?? "No se pudo actualizar el PIN.");
      }

      const statusResponse = await fetch("/api/security/pins", {
        cache: "no-store",
      });
      const statusPayload = (await statusResponse.json().catch(() => null)) as
        | { hasManager?: unknown; hasStaff?: unknown; updatedAt?: unknown }
        | null;

      if (statusPayload) {
        const updatedAt =
          typeof statusPayload.updatedAt === "string"
            ? statusPayload.updatedAt
            : statusPayload.updatedAt instanceof Date
              ? statusPayload.updatedAt.toISOString()
              : null;
        setStatuses([
          {
            scope: "staff",
            isSet: Boolean(statusPayload.hasStaff),
            updatedAt,
          },
          {
            scope: "manager",
            isSet: Boolean(statusPayload.hasManager),
            updatedAt,
          },
        ]);
      } else {
        setStatuses((previous) => {
          const other = previous.filter((status) => status.scope !== scope);
          return [
            ...other,
            {
              scope,
              isSet: true,
              updatedAt: new Date().toISOString(),
            },
          ];
        });
      }

      setForms((previous) => ({
        staff:
          scope === "staff"
            ? { ...emptyForm }
            : { ...previous.staff, managerPin: "" },
        manager:
          scope === "manager"
            ? { ...emptyForm }
            : { ...previous.manager, managerPin: "" },
      }));

      if (scope === "manager") {
        setManagerUnlocked(true);
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
    if (!managerUnlocked) {
      return (
        <div className="flex flex-col items-center justify-center gap-6">
          <PinPrompt
            scope="manager"
            title="Protegido con PIN de gerencia"
            description="Ingresa el PIN de gerencia para gestionar los accesos de seguridad."
            ctaLabel="Desbloquear"
            onSuccess={() => setManagerUnlocked(true)}
          />
        </div>
      );
    }

    const staffForm = forms.staff;
    const managerForm = forms.manager;

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
                value={managerForm.pin}
                onChange={(event) => handleFormChange("manager", "pin", event.target.value)}
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
                value={managerForm.confirmPin}
                onChange={(event) =>
                  handleFormChange("manager", "confirmPin", event.target.value)
                }
                className="rounded-3xl border border-brand-teal-soft bg-white px-5 py-3 text-base shadow-inner focus:border-brand-teal"
                maxLength={8}
                required
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => submitPinUpdate("manager")}
            disabled={loadingScope === "manager"}
            className="cta-ripple mt-4 inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loadingScope === "manager" ? "Guardando…" : "Actualizar PIN de gerencia"}
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
            Cada verificación se valida en el servidor, sin reutilizar sesiones y solicitando el PIN en cada acceso restringido.
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
