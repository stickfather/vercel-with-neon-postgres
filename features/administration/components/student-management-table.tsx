"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EphemeralToast } from "@/components/ui/ephemeral-toast";
import type {
  StudentFlagKey,
  StudentManagementEntry,
} from "@/features/administration/data/students";
import { StudentManagementGraphs } from "./student-management-graphs";

type Props = {
  students: StudentManagementEntry[];
};

export type FlagKey = StudentFlagKey;

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

const LEVEL_CODES: ReadonlyArray<string> = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
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

function sortStudents(entries: StudentManagementEntry[]): StudentManagementEntry[] {
  return [...entries].sort((a, b) =>
    a.fullName.localeCompare(b.fullName, "es", { sensitivity: "base" }),
  );
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [allStudents, setAllStudents] = useState<StudentManagementEntry[]>(() =>
    sortStudents(students),
  );
  const [stateFilters, setStateFilters] = useState<string[]>([]);
  const [flagFilters, setFlagFilters] = useState<FlagKey[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [toast, setToast] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newPlannedMin, setNewPlannedMin] = useState("");
  const [newPlannedMax, setNewPlannedMax] = useState("");
  const [addStudentError, setAddStudentError] = useState<string | null>(null);
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);

  useEffect(() => {
    setAllStudents(sortStudents(students));
  }, [students]);

  useEffect(() => {
    const deletedName = searchParams?.get("studentDeleted");
    if (deletedName) {
      setToast({
        tone: "success",
        message: `${deletedName} fue eliminado del registro.`,
      });
      router.replace(pathname);
    }
  }, [pathname, router, searchParams]);

  const totalStudents = allStudents.length;
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const stateTotals = useMemo(() => {
    const counts = new Map<string, number>();
    allStudents.forEach((student) => {
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
  }, [allStudents, totalStudents, stateFilters]);

  const flagTotals = useMemo(() => {
    return FLAG_COLUMNS.map((flag) => {
      const count = allStudents.reduce(
        (acc, student) => (student[flag.key] ? acc + 1 : acc),
        0,
      );
      return {
        key: flag.key,
        label: flag.label,
        count,
        percentage: totalStudents ? Math.round((count / totalStudents) * 100) : 0,
        selected: flagFilters.includes(flag.key),
      };
    }).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [allStudents, totalStudents, flagFilters]);

  const filteredStudents = useMemo(() => {
    return allStudents.filter((student) => {
      const stateKey = normalizeStateKey(student.state);
      const matchesState =
        stateFilters.length === 0 || stateFilters.includes(stateKey);
      const matchesFlags = flagFilters.every((flag) => Boolean(student[flag]));
      const matchesSearch =
        !normalizedSearchTerm.length ||
        student.fullName.toLowerCase().includes(normalizedSearchTerm);
      return matchesState && matchesFlags && matchesSearch;
    });
  }, [allStudents, stateFilters, flagFilters, normalizedSearchTerm]);

  const PAGE_SIZE = 40;
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(0);
  }, [stateFilters, flagFilters, normalizedSearchTerm]);

  useEffect(() => {
    setCurrentPage((previous) => {
      const lastPageIndex = Math.max(
        0,
        Math.ceil(filteredStudents.length / PAGE_SIZE) - 1,
      );
      return Math.min(previous, lastPageIndex);
    });
  }, [filteredStudents.length]);

  const paginatedStudents = useMemo(() => {
    const startIndex = currentPage * PAGE_SIZE;
    return filteredStudents.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredStudents, currentPage]);

  const showingFrom = filteredStudents.length
    ? currentPage * PAGE_SIZE + 1
    : 0;
  const showingTo = filteredStudents.length
    ? Math.min(filteredStudents.length, (currentPage + 1) * PAGE_SIZE)
    : 0;

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
  const hasSearch = normalizedSearchTerm.length > 0;

  const resetAddStudentForm = () => {
    setNewStudentName("");
    setNewPlannedMin("");
    setNewPlannedMax("");
    setAddStudentError(null);
  };

  const openAddStudentDialog = () => {
    resetAddStudentForm();
    setIsAddStudentOpen(true);
  };

  const closeAddStudentDialog = () => {
    setIsAddStudentOpen(false);
    setAddStudentError(null);
  };

  const handleAddStudentSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const trimmedName = newStudentName.trim();
    const plannedMin = newPlannedMin.trim();
    const plannedMax = newPlannedMax.trim();

    if (!trimmedName) {
      setAddStudentError("Ingresa el nombre del estudiante.");
      return;
    }

    if (!plannedMin) {
      setAddStudentError("Selecciona el nivel planificado mínimo.");
      return;
    }

    if (!plannedMax) {
      setAddStudentError("Selecciona el nivel planificado máximo.");
      return;
    }

    setIsCreatingStudent(true);
    setAddStudentError(null);

    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: trimmedName,
          plannedLevelMin: plannedMin,
          plannedLevelMax: plannedMax,
        }),
      });

      const payload = (await response
        .json()
        .catch(() => ({}))) as {
        student?: StudentManagementEntry;
        error?: string;
      };

      if (!response.ok || !payload.student) {
        throw new Error(
          payload?.error ??
            "No se pudo crear el estudiante. Inténtalo nuevamente.",
        );
      }

      setAllStudents((previous) =>
        sortStudents([
          ...previous.filter((student) => student.id !== payload.student!.id),
          payload.student!,
        ]),
      );
      setToast({
        tone: "success",
        message: `${payload.student.fullName} fue agregado correctamente.`,
      });
      setIsAddStudentOpen(false);
      resetAddStudentForm();
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo crear el estudiante. Inténtalo nuevamente.";
      setAddStudentError(message);
    } finally {
      setIsCreatingStudent(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {toast ? (
        <EphemeralToast
          message={toast.message}
          tone={toast.tone}
          onDismiss={() => setToast(null)}
        />
      ) : null}

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
        <div className="flex flex-col gap-3 border-b border-brand-ink-muted/10 bg-white/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex w-full flex-col gap-1 text-sm font-semibold text-brand-deep sm:max-w-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
              Buscar estudiante
            </span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Escribe un nombre para filtrar"
              className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm leading-relaxed text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
            />
          </label>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {hasSearch && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal-soft px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-teal transition hover:-translate-y-[1px] hover:bg-brand-teal-soft/70 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
              >
                Limpiar búsqueda
              </button>
            )}
            <button
              type="button"
              onClick={openAddStudentDialog}
              className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-orange px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#ff6a00] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
            >
              Agregar estudiante
            </button>
          </div>
        </div>
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
            {paginatedStudents.map((student) => {
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
                  {hasActiveFilters || hasSearch
                    ? "No encontramos estudiantes que coincidan con los filtros o búsqueda seleccionados."
                    : "No encontramos estudiantes en la vista de gestión. Revisa la configuración de la base de datos."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="flex flex-col gap-3 border-t border-brand-ink-muted/10 bg-white/70 px-5 py-4 text-sm text-brand-ink">
          <div>
            {filteredStudents.length ? (
              <span>
                Mostrando {showingFrom}
                {showingFrom !== showingTo ? `-${showingTo}` : ""} de {filteredStudents.length} estudiantes
              </span>
            ) : (
              <span>No hay estudiantes para mostrar.</span>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs uppercase tracking-[0.28em] text-brand-ink-muted">
              Página {Math.min(currentPage + 1, totalPages)} de {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((previous) => Math.max(0, previous - 1))}
                disabled={currentPage === 0}
                className="inline-flex items-center justify-center rounded-full border border-brand-ink-muted/20 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-deep transition hover:-translate-y-[1px] hover:bg-brand-teal-soft/60 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-50"
              >
                ← Anterior
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((previous) => Math.min(totalPages - 1, previous + 1))}
                disabled={currentPage >= totalPages - 1}
                className="inline-flex items-center justify-center rounded-full border border-brand-ink-muted/20 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-deep transition hover:-translate-y-[1px] hover:bg-brand-teal-soft/60 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>
      </div>

      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.45)] px-4 py-8 backdrop-blur-sm">
          <form
            onSubmit={handleAddStudentSubmit}
            className="w-full max-w-lg rounded-[32px] border border-white/70 bg-white/95 p-6 text-brand-ink shadow-[0_28px_64px_rgba(15,23,42,0.18)]"
          >
            <div className="flex flex-col gap-4">
              <header className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-ink-muted">
                  Nuevo registro
                </span>
                <h2 className="text-2xl font-black text-brand-deep">Agregar estudiante</h2>
                <p className="text-sm text-brand-ink-muted">
                  Crea el perfil básico y completa los demás datos desde su ficha individual.
                </p>
              </header>

              <label className="flex flex-col gap-2 text-sm font-medium text-brand-deep">
                Nombre del estudiante
                <input
                  type="text"
                  value={newStudentName}
                  onChange={(event) => setNewStudentName(event.target.value)}
                  className="rounded-3xl border border-brand-ink-muted/25 bg-white px-4 py-3 text-sm text-brand-ink shadow focus:border-brand-teal focus:outline-none"
                  placeholder="Nombre y apellido"
                  required
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-brand-deep">
                  Nivel planificado mínimo
                  <select
                    value={newPlannedMin}
                    onChange={(event) => setNewPlannedMin(event.target.value)}
                    className="rounded-3xl border border-brand-ink-muted/25 bg-white px-4 py-3 text-sm text-brand-ink shadow focus:border-brand-teal focus:outline-none"
                    required
                  >
                    <option value="" disabled>
                      Selecciona un nivel
                    </option>
                    {LEVEL_CODES.map((level) => (
                      <option key={`planned-min-${level}`} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-brand-deep">
                  Nivel planificado máximo
                  <select
                    value={newPlannedMax}
                    onChange={(event) => setNewPlannedMax(event.target.value)}
                    className="rounded-3xl border border-brand-ink-muted/25 bg-white px-4 py-3 text-sm text-brand-ink shadow focus:border-brand-teal focus:outline-none"
                    required
                  >
                    <option value="" disabled>
                      Selecciona un nivel
                    </option>
                    {LEVEL_CODES.map((level) => (
                      <option key={`planned-max-${level}`} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {addStudentError ? (
                <div className="rounded-3xl border border-brand-orange bg-white/85 px-4 py-3 text-sm font-medium text-brand-ink">
                  {addStudentError}
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeAddStudentDialog}
                  className="inline-flex items-center justify-center rounded-full border border-brand-ink-muted/30 bg-white px-5 py-2 text-sm font-semibold uppercase tracking-wide text-brand-ink transition hover:-translate-y-[1px] hover:bg-brand-teal-soft/50 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                  disabled={isCreatingStudent}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingStudent}
                  className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-6 py-2 text-sm font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#00a894] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isCreatingStudent ? "Guardando…" : "Crear estudiante"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export { StudentManagementTable };
export default StudentManagementTable;
