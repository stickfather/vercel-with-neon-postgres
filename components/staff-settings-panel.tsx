"use client";

import { useMemo, useState } from "react";
import type { StaffMemberRecord } from "@/app/db";

type StatusState = { type: "error" | "success"; message: string } | null;

type FormState = {
  fullName: string;
  role: string;
  hourlyWage: string;
  weeklyHours: string;
  active: boolean;
};

type Props = {
  initialStaff: StaffMemberRecord[];
  initialError?: string | null;
};

const emptyForm: FormState = {
  fullName: "",
  role: "",
  hourlyWage: "",
  weeklyHours: "",
  active: true,
};

function parseNumber(value: string): number | null {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function StaffSettingsPanel({ initialStaff, initialError = null }: Props) {
  const [staff, setStaff] = useState(initialStaff);
  const [status, setStatus] = useState<StatusState>(
    initialError ? { type: "error", message: initialError } : null,
  );
  const [createForm, setCreateForm] = useState<FormState>(emptyForm);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const sortedStaff = useMemo(() => {
    return [...staff].sort((a, b) =>
      a.fullName.localeCompare(b.fullName, "es", { sensitivity: "base" }),
    );
  }, [staff]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!createForm.fullName.trim()) {
      setStatus({ type: "error", message: "El nombre es obligatorio." });
      return;
    }

    try {
      setIsCreating(true);
      setStatus(null);

      const response = await fetch("/api/staff-members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: createForm.fullName,
          role: createForm.role || null,
          hourlyWage: parseNumber(createForm.hourlyWage),
          weeklyHours: parseNumber(createForm.weeklyHours),
          active: createForm.active,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo crear el registro.");
      }

      setStaff((previous) => [...previous, payload]);
      setCreateForm(emptyForm);
      setStatus({
        type: "success",
        message: "Miembro del personal añadido correctamente.",
      });
    } catch (error) {
      console.error(error);
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No logramos crear el registro del personal.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const startEdit = (member: StaffMemberRecord) => {
    setEditingId(member.id);
    setEditForm({
      fullName: member.fullName,
      role: member.role ?? "",
      hourlyWage: member.hourlyWage !== null ? String(member.hourlyWage) : "",
      weeklyHours: member.weeklyHours !== null ? String(member.weeklyHours) : "",
      active: member.active,
    });
    setStatus(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm);
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>, id: number) => {
    event.preventDefault();

    if (!editForm.fullName.trim()) {
      setStatus({ type: "error", message: "El nombre es obligatorio." });
      return;
    }

    try {
      setUpdatingId(id);
      setStatus(null);

      const response = await fetch(`/api/staff-members/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: editForm.fullName,
          role: editForm.role || null,
          hourlyWage: parseNumber(editForm.hourlyWage),
          weeklyHours: parseNumber(editForm.weeklyHours),
          active: editForm.active,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo actualizar el registro.");
      }

      setStaff((previous) =>
        previous.map((member) => (member.id === id ? payload : member)),
      );
      setStatus({
        type: "success",
        message: "Cambios guardados correctamente.",
      });
      cancelEdit();
    } catch (error) {
      console.error(error);
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No logramos actualizar la información del personal.",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (
      !window.confirm(
        "¿Seguro que quieres eliminar a este miembro del personal?",
      )
    ) {
      return;
    }

    try {
      setDeletingId(id);
      setStatus(null);
      const response = await fetch(`/api/staff-members/${id}`, {
        method: "DELETE",
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo eliminar el registro.");
      }

      setStaff((previous) => previous.filter((member) => member.id !== id));
      setStatus({
        type: "success",
        message: "Miembro del personal eliminado.",
      });
    } catch (error) {
      console.error(error);
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No logramos eliminar al miembro del personal.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="flex flex-col gap-10 rounded-[48px] border-2 border-[#e0e5ff] bg-white/90 p-8 shadow-[0_28px_60px_rgba(15,23,42,0.12)] backdrop-blur">
      <header className="flex flex-col gap-2 text-left">
        <h2 className="text-2xl font-black text-brand-deep">Gestión del equipo</h2>
        <p className="text-sm text-brand-ink-muted">
          Añade nuevos integrantes, ajusta roles y mantén la información del personal siempre actualizada.
        </p>
      </header>

      {status && (
        <div
          className={`rounded-3xl border px-5 py-3 text-sm font-medium ${
            status.type === "success"
              ? "border-brand-teal bg-[#e1f7f3] text-brand-deep"
              : "border-brand-orange bg-[#fff4ec] text-brand-ink"
          }`}
        >
          {status.message}
        </div>
      )}

      <form
        className="grid gap-4 rounded-[28px] border border-[#ffd9bb] bg-[#fff7f0] p-6 shadow-inner md:grid-cols-2"
        onSubmit={handleCreate}
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-brand-deep">
            Nombre completo
          </label>
          <input
            value={createForm.fullName}
            onChange={(event) =>
              setCreateForm((previous) => ({
                ...previous,
                fullName: event.target.value,
              }))
            }
            className="rounded-2xl border border-[#ffd1a3] bg-white px-4 py-3 text-sm shadow-sm focus:border-[#00bfa6]"
            placeholder="Ingresa el nombre"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-brand-deep">
            Rol
          </label>
          <input
            value={createForm.role}
            onChange={(event) =>
              setCreateForm((previous) => ({
                ...previous,
                role: event.target.value,
              }))
            }
            className="rounded-2xl border border-[#ffd1a3] bg-white px-4 py-3 text-sm shadow-sm focus:border-[#00bfa6]"
            placeholder="Coordinador, profesor, etc."
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-brand-deep">
            Tarifa por hora
          </label>
          <input
            value={createForm.hourlyWage}
            onChange={(event) =>
              setCreateForm((previous) => ({
                ...previous,
                hourlyWage: event.target.value,
              }))
            }
            className="rounded-2xl border border-[#ffd1a3] bg-white px-4 py-3 text-sm shadow-sm focus:border-[#00bfa6]"
            placeholder="Ej. 12.5"
            inputMode="decimal"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-brand-deep">
            Horas semanales
          </label>
          <input
            value={createForm.weeklyHours}
            onChange={(event) =>
              setCreateForm((previous) => ({
                ...previous,
                weeklyHours: event.target.value,
              }))
            }
            className="rounded-2xl border border-[#ffd1a3] bg-white px-4 py-3 text-sm shadow-sm focus:border-[#00bfa6]"
            placeholder="Ej. 20"
            inputMode="decimal"
          />
        </div>
        <label className="flex items-center gap-2 rounded-2xl border border-[#ffd1a3] bg-white px-4 py-3 text-sm font-semibold text-brand-ink">
          <input
            type="checkbox"
            checked={createForm.active}
            onChange={(event) =>
              setCreateForm((previous) => ({
                ...previous,
                active: event.target.checked,
              }))
            }
            className="h-4 w-4 rounded border-brand-orange text-brand-orange focus:ring-brand-orange"
          />
          Activo en la sede
        </label>
        <div className="flex items-end justify-end">
          <button
            type="submit"
            disabled={isCreating}
            className="inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-[0_12px_30px_rgba(255,122,35,0.26)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isCreating ? "Guardando…" : "Agregar"}
          </button>
        </div>
      </form>

      <div className="flex flex-col gap-4">
        {sortedStaff.map((member) => (
          <div
            key={member.id}
            className="rounded-[28px] border border-[#e1e5ff] bg-white px-5 py-4 shadow-sm"
          >
            {editingId === member.id ? (
              <form
                className="grid gap-3 md:grid-cols-6"
                onSubmit={(event) => handleUpdate(event, member.id)}
              >
                <div className="md:col-span-2 flex flex-col gap-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
                    Nombre completo
                  </label>
                  <input
                    value={editForm.fullName}
                    onChange={(event) =>
                      setEditForm((previous) => ({
                        ...previous,
                        fullName: event.target.value,
                      }))
                    }
                    className="rounded-2xl border border-[#d7ddff] bg-white px-3 py-2 text-sm focus:border-[#00bfa6]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
                    Rol
                  </label>
                  <input
                    value={editForm.role}
                    onChange={(event) =>
                      setEditForm((previous) => ({
                        ...previous,
                        role: event.target.value,
                      }))
                    }
                    className="rounded-2xl border border-[#d7ddff] bg-white px-3 py-2 text-sm focus:border-[#00bfa6]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
                    Tarifa
                  </label>
                  <input
                    value={editForm.hourlyWage}
                    onChange={(event) =>
                      setEditForm((previous) => ({
                        ...previous,
                        hourlyWage: event.target.value,
                      }))
                    }
                    className="rounded-2xl border border-[#d7ddff] bg-white px-3 py-2 text-sm focus:border-[#00bfa6]"
                    inputMode="decimal"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
                    Horas
                  </label>
                  <input
                    value={editForm.weeklyHours}
                    onChange={(event) =>
                      setEditForm((previous) => ({
                        ...previous,
                        weeklyHours: event.target.value,
                      }))
                    }
                    className="rounded-2xl border border-[#d7ddff] bg-white px-3 py-2 text-sm focus:border-[#00bfa6]"
                    inputMode="decimal"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editForm.active}
                    onChange={(event) =>
                      setEditForm((previous) => ({
                        ...previous,
                        active: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-brand-orange text-brand-orange focus:ring-brand-orange"
                  />
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink">
                    Activo
                  </span>
                </div>
                <div className="md:col-span-6 flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="submit"
                    disabled={updatingId === member.id}
                    className="inline-flex items-center justify-center rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {updatingId === member.id ? "Guardando…" : "Guardar"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted hover:text-brand-orange"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid gap-3 md:grid-cols-6">
                <div className="md:col-span-2">
                  <p className="text-base font-semibold text-brand-deep">
                    {member.fullName}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-brand-ink-muted">
                    {member.role ?? "Sin rol asignado"}
                  </p>
                </div>
                <div className="flex flex-col justify-center gap-1 text-xs text-brand-ink-muted">
                  <span className="font-semibold text-brand-ink">Tarifa</span>
                  <span>
                    {member.hourlyWage !== null
                      ? `$${member.hourlyWage.toFixed(2)}`
                      : "—"}
                  </span>
                </div>
                <div className="flex flex-col justify-center gap-1 text-xs text-brand-ink-muted">
                  <span className="font-semibold text-brand-ink">Horas</span>
                  <span>
                    {member.weeklyHours !== null
                      ? `${member.weeklyHours} h`
                      : "—"}
                  </span>
                </div>
                <div className="flex flex-col justify-center gap-1 text-xs text-brand-ink-muted">
                  <span className="font-semibold text-brand-ink">Estado</span>
                  <span
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      member.active ? "text-brand-teal" : "text-brand-ink-muted"
                    }`}
                  >
                    {member.active ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <div className="md:col-span-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => startEdit(member)}
                    className="text-xs font-semibold uppercase tracking-wide text-brand-teal hover:text-brand-deep"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(member.id)}
                    disabled={deletingId === member.id}
                    className="text-xs font-semibold uppercase tracking-wide text-brand-orange hover:text-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingId === member.id ? "Eliminando…" : "Eliminar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
