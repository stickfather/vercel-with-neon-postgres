"use client";

import { useMemo, useState } from "react";
import type { StudentWithFlags } from "@/features/administration/data/students";

type FlagKey = keyof StudentWithFlags["flags"];

type Props = {
  students: StudentWithFlags[];
};

const FLAG_DEFINITIONS: Array<{ key: FlagKey; label: string }> = [
  { key: "isAbsent", label: "Ausente" },
  { key: "isNewStudent", label: "Nuevo ingreso" },
  { key: "isExamApproaching", label: "Próximo a examen" },
  { key: "hasSpecialNeeds", label: "Necesidades especiales" },
  { key: "isSlowProgress", label: "Progreso lento" },
  { key: "instructivoActive", label: "Instructivo activo" },
  { key: "instructivoOverdue", label: "Instructivo vencido" },
];

export function StudentManagementTable({ students }: Props) {
  const [stateFilter, setStateFilter] = useState<string>("__all");
  const [selectedFlags, setSelectedFlags] = useState<FlagKey[]>([]);

  const stateOptions = useMemo(() => {
    const values = new Set<string>();
    for (const student of students) {
      const state = (student.state ?? "").trim();
      if (state) {
        values.add(state);
      }
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b, "es"));
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      if (stateFilter !== "__all") {
        const studentState = (student.state ?? "").trim();
        if (studentState !== stateFilter) {
          return false;
        }
      }
      if (selectedFlags.length) {
        return selectedFlags.every((flag) => student.flags[flag]);
      }
      return true;
    });
  }, [students, stateFilter, selectedFlags]);

  const toggleFlag = (flag: FlagKey) => {
    setSelectedFlags((previous) =>
      previous.includes(flag)
        ? previous.filter((item) => item !== flag)
        : [...previous, flag],
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_18px_44px_rgba(15,23,42,0.12)] backdrop-blur">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <label htmlFor="state-filter" className="text-xs font-semibold uppercase tracking-wide text-brand-deep">
              Filtrar por estado
            </label>
            <select
              id="state-filter"
              value={stateFilter}
              onChange={(event) => setStateFilter(event.target.value)}
              className="w-full rounded-full border border-transparent bg-white px-4 py-2 text-sm text-brand-ink shadow focus:border-brand-teal focus:outline-none sm:w-60"
            >
              <option value="__all">Todos los estados</option>
              {stateOptions.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-3">
            {FLAG_DEFINITIONS.map((flag) => {
              const checked = selectedFlags.includes(flag.key);
              return (
                <label
                  key={flag.key}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-medium text-brand-ink shadow-sm ring-1 ring-brand-deep-soft/40"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleFlag(flag.key)}
                    className="h-4 w-4 rounded border-brand-deep text-brand-teal focus:ring-brand-teal"
                  />
                  <span>{flag.label}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="text-xs text-brand-ink-muted">
          Mostrando <strong className="font-semibold text-brand-deep">{filteredStudents.length}</strong> de {students.length} estudiantes
          totales.
        </div>
      </div>

      <div className="overflow-hidden rounded-[32px] border border-white/70 bg-white/95 shadow-[0_24px_58px_rgba(15,23,42,0.12)]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-brand-ink-muted/20 text-left">
            <thead className="bg-brand-deep-soft/30 text-xs uppercase tracking-wide text-brand-ink">
              <tr>
                <th scope="col" className="px-6 py-3 font-semibold text-brand-deep">
                  Nombre
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-brand-deep">
                  Estado
                </th>
                {FLAG_DEFINITIONS.map((flag) => (
                  <th key={flag.key} scope="col" className="px-4 py-3 font-semibold text-brand-deep">
                    {flag.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-ink-muted/15 text-sm text-brand-ink">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-brand-teal-soft/20">
                  <td className="px-6 py-3 font-semibold text-brand-deep">{student.fullName}</td>
                  <td className="px-4 py-3 text-xs uppercase tracking-wide text-brand-ink-muted">
                    {student.status ?? "Sin estado"}
                  </td>
                  {FLAG_DEFINITIONS.map((flag) => (
                    <td key={flag.key} className="px-4 py-3 text-center text-base">
                      {student.flags[flag.key] ? "✅" : "❌"}
                    </td>
                  ))}
                </tr>
              ))}
              {!filteredStudents.length && (
                <tr>
                  <td
                    colSpan={2 + FLAG_DEFINITIONS.length}
                    className="px-6 py-6 text-center text-sm text-brand-ink-muted"
                  >
                    No hay estudiantes que coincidan con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
