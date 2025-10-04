"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { StudentManagementEntry } from "@/features/administration/data/students";
import { StudentManagementGraphs } from "./student-management-graphs";

type Props = {
  students: StudentManagementEntry[];
};

export type FlagKey =
  | "isNewStudent"
  | "isExamApproaching"
  | "isExamPreparation"
  | "hasSpecialNeeds"
  | "isAbsent7Days"
  | "isSlowProgress14Days"
  | "hasActiveInstructive"
  | "hasOverdueInstructive";

const FLAG_COLUMNS: ReadonlyArray<{ key: FlagKey; label: string }> = [
  { key: "isNewStudent", label: "Nuevo" },
  { key: "isExamApproaching", label: "Examen pronto" },
  { key: "isExamPreparation", label: "Prep. examen" },
  { key: "hasSpecialNeeds", label: "Necesidades especiales" },
  { key: "isAbsent7Days", label: "Ausente 7d" },
  { key: "isSlowProgress14Days", label: "Progreso lento 14d" },
  { key: "hasActiveInstructive", label: "Instructivo activo" },
  { key: "hasOverdueInstructive", label: "Instructivo vencido" },
];

const STATE_TRANSLATIONS: Record<string, string> = {
  active: "activo",
  frozen: "congelado",
  contract_terminated: "contrato terminado",
  online: "en línea",
  invalid: "inválido",
};

const UNKNOWN_STATE_KEY = "__unknown__";

function normalizeStateKey(state: string | null): string {
  if (!state) return UNKNOWN_STATE_KEY;
  return state.toLowerCase();
}

function translateState(state: string | null): string {
  const key = normalizeStateKey(state);
  if (STATE_TRANSLATIONS[key]) return STATE_TRANSLATIONS[key];
  if (key === UNKNOWN_STATE_KEY) return "sin estado";
  return key.replace(/_/g, " ");
}

function FlagIndicator({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`inline-flex min-w-[48px] items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${active ? "bg-brand-teal-soft text-brand-teal" : "bg-brand-ink-muted/15 text-brand-ink"}`}
      aria-label={`${label}: ${active ? "sí" : "no"}`}
    >
      {active ? "Sí" : "No"}
    </span>
  );
}

function StudentManagementTable({ students }: Props) {
  const [stateFilters, setStateFilters] = useState<string[]>([]);
  const [flagFilters, setFlagFilters] = useState<FlagKey[]>([]);

  const totalStudents = students.length;

  const stateTotals = useMemo(() => {
    const counts = new Map<string, number>();
    students.forEach((student) => {
      const key = normalizeStateKey(student.state);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([key, count]) => ({
        key,
        label: translateState(key === UNKNOWN_STATE_KEY ? null : key),
        count,
        percentage: totalStudents ? Math.round((count / totalStudents) * 100) : 0,
        selected: stateFilters.includes(key),
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [students, totalStudents, stateFilters]);

  const flagTotals = useMemo(() => {
    return FLAG_COLUMNS.map((flag) => {
      const count = students.reduce((acc, student) => (student[flag.key] ? acc + 1 : acc), 0);
      return {
        key: flag.key,
        label: flag.label,
        count,
        percentage: totalStudents ? Math.round((count / totalStudents) * 100) : 0,
        selected: flagFilters.includes(flag.key),
      };
    }).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [students, totalStudents, flagFilters]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const stateKey = normalizeStateKey(student.state);
      const matchesState =
        stateFilters.length === 0 || stateFilters.includes(stateKey);
      const matchesFlags = flagFilters.every((flag) => Boolean(student[flag]));
      return matchesState && matchesFlags;
    });
  }, [students, stateFilters, flagFilters]);

  const toggleStateFilter = (key: string) => {
    setStateFilters((previous) =>
      previous.includes(key)
        ? previous.filter((item) => item !== key)
        : [...previous, key],
    );
  };

  const toggleFlagFilter = (key: FlagKey) => {
    setFlagFilters((previous) =>
      previous.includes(key)
        ? previous.filter((item) => item !== key)
        : [...previous, key],
    );
  };

  const clearFilters = () => {
    setStateFilters([]);
    setFlagFilters([]);
  };

  const hasActiveFilters = stateFilters.length > 0 || flagFilters.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <StudentManagementGraphs
        totalStudents={totalStudents}
        filteredStudents={filteredStudents.length}
        stateData={stateTotals}
        flagData={flagTotals}
        onToggleState={toggleStateFilter}
        onToggleFlag={toggleFlagFilter}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <div className="overflow-hidden rounded-[32px] border border-white/70 bg-white/95 shadow-[0_24px_58px_rgba(15,23,42,0.12)]">
        <table className="min-w-full table-auto divide-y divide-brand-ink-muted/20 text-left">
          <thead className="bg-white text-[11px] uppercase tracking-wide text-brand-ink">
            <tr>
              <th scope="col" className="px-5 py-3 text-left font-semibold text-brand-deep whitespace-normal leading-snug">
                Nombre
              </th>
              <th scope="col" className="px-3 py-3 text-left font-semibold text-brand-deep whitespace-normal leading-snug">
                Estado
              </th>
              {FLAG_COLUMNS.map((flag) => (
                <th
                  key={flag.key}
                  scope="col"
                  className="px-2 py-3 text-center font-semibold text-brand-deep-soft whitespace-normal leading-snug"
                >
                  {flag.label}
                </th>
              ))}
              <th scope="col" className="px-3 py-3 text-right font-semibold text-brand-deep whitespace-normal leading-snug">
                Perfil
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-ink-muted/15 text-sm text-brand-ink">
            {filteredStudents.map((student) => {
              const stateLabel = translateState(student.state);
              return (
                <tr key={student.id} className="align-top transition hover:bg-brand-teal-soft/20">
                  <td className="px-5 py-3 align-top">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-brand-deep whitespace-pre-wrap break-words leading-snug">
                        {student.fullName}
                      </span>
                      {student.level && (
                        <span className="text-xs uppercase tracking-wide text-brand-ink-muted">
                          Nivel {student.level}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <span className="font-semibold text-brand-deep-soft capitalize whitespace-pre-wrap break-words leading-snug">
                      {stateLabel}
                    </span>
                  </td>
                  {FLAG_COLUMNS.map((flag) => {
                    const isActive = Boolean(student[flag.key]);
                    return (
                      <td key={`${student.id}-${flag.key}`} className="px-2 py-3 text-center align-top">
                        <FlagIndicator active={isActive} label={flag.label} />
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-right align-top">
                    <Link
                      href={`/administracion/gestion-estudiantes/${student.id}`}
                      className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal-soft px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-brand-teal transition hover:-translate-y-[1px] hover:bg-brand-teal-soft/70 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                    >
                      Ver perfil
                    </Link>
                  </td>
                </tr>
              );
            })}

            {!filteredStudents.length && (
              <tr>
                <td colSpan={FLAG_COLUMNS.length + 3} className="px-6 py-6 text-center text-sm text-brand-ink-muted">
                  {hasActiveFilters
                    ? "No encontramos estudiantes que coincidan con los filtros seleccionados."
                    : "No encontramos estudiantes en la vista de gestión. Revisa la configuración de la base de datos."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { StudentManagementTable };
export default StudentManagementTable;
