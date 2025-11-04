"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { StudentManagementEntry } from "@/features/administration/data/students";
import {
  buildStudentStatusSummary,
  getStudentStatusDisplay,
  normalizeStudentStatus,
  type StudentStatusKey,
} from "@/features/administration/constants/student-status";
import { StudentManagementGraphs } from "./student-management-graphs";
import { queueableFetch } from "@/lib/offline/fetch";
import { useOfflineStatus } from "@/components/offline/offline-provider";
import { EphemeralToast } from "@/components/ui/ephemeral-toast";

type Props = {
  students: StudentManagementEntry[];
};

export type FlagKey =
  | "isNewStudent"
  | "isExamPreparation"
  | "hasSpecialNeeds"
  | "isAbsent7Days"
  | "isSlowProgress14Days"
  | "hasActiveInstructive"
  | "hasOverdueInstructive";

const FLAG_COLUMNS: ReadonlyArray<{ key: FlagKey; label: string }> = [
  { key: "isNewStudent", label: "Nuevo" },
  { key: "isExamPreparation", label: "Prep. examen" },
  { key: "hasSpecialNeeds", label: "Necesidades especiales" },
  { key: "isAbsent7Days", label: "Ausente 7d" },
  { key: "isSlowProgress14Days", label: "Progreso lento 14d" },
  { key: "hasActiveInstructive", label: "Instructivo activo" },
  { key: "hasOverdueInstructive", label: "Instructivo vencido" },
];

const LEVEL_FILTER_VALUES = ["A1", "A2", "B1", "B2", "C1"] as const;
type LevelFilterValue = "all" | (typeof LEVEL_FILTER_VALUES)[number];

const LEVEL_FILTER_OPTIONS: ReadonlyArray<{ label: string; value: LevelFilterValue }> = [
  { label: "Todos los niveles", value: "all" },
  ...LEVEL_FILTER_VALUES.map((value) => ({ label: value, value })),
];

function normalizeLevelFilter(value: string | null): LevelFilterValue {
  if (!value) {
    return "all";
  }
  const normalized = value.trim().toUpperCase();
  return (LEVEL_FILTER_VALUES as readonly string[]).includes(normalized)
    ? (normalized as LevelFilterValue)
    : "all";
}

const PAGE_SIZE = 40;

type ManagedStudent = StudentManagementEntry & {
  isPending?: boolean;
};

type ToastState = {
  tone: "success" | "error";
  message: string;
};

function formatStatusDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  return value;
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

function formatStudentPosition(level: string | null, lesson: string | null): string {
  const normalizedLevel = level?.trim();
  const normalizedLesson = lesson?.trim();

  if (normalizedLevel && normalizedLesson) {
    return `${normalizedLevel} · ${normalizedLesson}`;
  }

  if (normalizedLevel) {
    return normalizedLevel;
  }

  return normalizedLesson ?? "";
}

function StudentManagementTable({ students }: Props) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { lastSyncAt } = useOfflineStatus();
  const [studentList, setStudentList] = useState<ManagedStudent[]>(students);
  const [statusFilters, setStatusFilters] = useState<StudentStatusKey[]>([]);
  const [flagFilters, setFlagFilters] = useState<FlagKey[]>([]);
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("q") ?? "");
  const [levelFilter, setLevelFilter] = useState<LevelFilterValue>(() =>
    normalizeLevelFilter(searchParams.get("level")),
  );
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentMinLevel, setNewStudentMinLevel] = useState("");
  const [newStudentMaxLevel, setNewStudentMaxLevel] = useState("");
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setStudentList((previous) => {
      const pending = previous.filter((student) => student.isPending);
      const normalizedNames = new Set(
        students.map((student) => student.fullName.trim().toLowerCase()),
      );
      const remainingPending = pending.filter(
        (student) => !normalizedNames.has(student.fullName.trim().toLowerCase()),
      );
      return [...students, ...remainingPending];
    });
  }, [students]);

  useEffect(() => {
    const paramSearch = searchParams.get("q") ?? "";
    if (paramSearch !== searchTerm) {
      setSearchTerm(paramSearch);
    }

    const normalizedLevel = normalizeLevelFilter(searchParams.get("level"));
    if (normalizedLevel !== levelFilter) {
      setLevelFilter(normalizedLevel);
    }
  }, [searchParams, searchTerm, levelFilter]);

  useEffect(() => {
    if (lastSyncAt) {
      router.refresh();
    }
  }, [lastSyncAt, router]);

  const updateQueryParams = useCallback(
    (nextSearch: string, nextLevel: LevelFilterValue) => {
      const currentQuery = searchParams.toString();
      const params = new URLSearchParams(currentQuery);

      if (nextSearch.trim()) {
        params.set("q", nextSearch.trim());
      } else {
        params.delete("q");
      }

      if (nextLevel !== "all") {
        params.set("level", nextLevel);
      } else {
        params.delete("level");
      }

      const nextQuery = params.toString();
      if (nextQuery === currentQuery) {
        return;
      }

      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const debouncedUpdateQueryParams = useCallback(
    (nextSearch: string, nextLevel: LevelFilterValue) => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
      searchDebounceRef.current = setTimeout(() => {
        updateQueryParams(nextSearch, nextLevel);
      }, 300);
    },
    [updateQueryParams],
  );

  const totalStudents = studentList.length;
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const statusTotals = useMemo(() => {
    return buildStudentStatusSummary(studentList).map((item) => ({
      key: item.status,
      label: item.label,
      count: item.count,
      percentage: item.percentage,
      selected: statusFilters.includes(item.status),
    }));
  }, [studentList, statusFilters]);

  const flagTotals = useMemo(() => {
    return FLAG_COLUMNS.map((flag) => {
      const count = studentList.reduce(
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
  }, [studentList, totalStudents, flagFilters]);

  const filteredStudents = useMemo(() => {
    return studentList.filter((student) => {
      const statusKey = normalizeStudentStatus(student.status);
      const matchesStatus =
        statusFilters.length === 0 ||
        (statusKey != null && statusFilters.includes(statusKey));
      const matchesFlags = flagFilters.every((flag) => Boolean(student[flag]));
      const matchesSearch =
        !normalizedSearchTerm.length ||
        student.fullName.toLowerCase().includes(normalizedSearchTerm);
      const studentLevel = student.level?.trim().toUpperCase() ?? "";
      const matchesLevel = levelFilter === "all" || studentLevel === levelFilter;
      return matchesStatus && matchesFlags && matchesSearch && matchesLevel;
    });
  }, [studentList, statusFilters, flagFilters, normalizedSearchTerm, levelFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilters, flagFilters, normalizedSearchTerm, levelFilter, studentList.length]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
    setCurrentPage((previous) => Math.min(previous, totalPages));
  }, [filteredStudents.length]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const clampedPage = Math.min(currentPage, totalPages);
  const pageStart = (clampedPage - 1) * PAGE_SIZE;
  const paginatedStudents = filteredStudents.slice(
    pageStart,
    pageStart + PAGE_SIZE,
  );

  const addStudentToList = useCallback((entry: ManagedStudent) => {
    setStudentList((previous) => {
      const normalizedName = entry.fullName.trim().toLowerCase();
      const withoutDuplicates = previous.filter((student) => {
        if (student.id === entry.id) return false;
        if (student.isPending && student.fullName.trim().toLowerCase() === normalizedName) {
          return false;
        }
        return true;
      });
      const next = [...withoutDuplicates, entry];
      next.sort((a, b) =>
        a.fullName.localeCompare(b.fullName, "es", { sensitivity: "base" }),
      );
      return next;
    });
  }, []);

  const handleCreateStudent = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const name = newStudentName.trim();
      const minLevel = newStudentMinLevel.trim();
      const maxLevel = newStudentMaxLevel.trim();

      if (!name || !minLevel || !maxLevel) {
        setToast({
          tone: "error",
          message:
            "Completa el nombre y los niveles planificados para agregar un nuevo estudiante.",
        });
        return;
      }

      setIsSubmittingStudent(true);
      try {
        const response = await queueableFetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: name,
            plannedLevelMin: minLevel,
            plannedLevelMax: maxLevel,
          }),
          offlineLabel: "student-create",
        });

        const payload = (await response.json().catch(() => ({}))) as {
          student?: StudentManagementEntry;
          queued?: boolean;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload?.error ?? "No se pudo crear el estudiante.");
        }

        if (payload.student) {
          addStudentToList({ ...payload.student, isPending: false });
          setToast({
            tone: "success",
            message: `${payload.student.fullName} fue agregado correctamente.`,
          });
        } else {
          const pendingEntry: ManagedStudent = {
            id: -Date.now(),
            fullName: name,
            level: null,
            lesson: null,
            lastSeenAt: null,
            status: null,
            contractEnd: null,
            graduationDate: null,
            isNewStudent: true,
            isExamPreparation: false,
            hasSpecialNeeds: false,
            isAbsent7Days: false,
            isSlowProgress14Days: false,
            hasActiveInstructive: false,
            hasOverdueInstructive: false,
            archived: false,
            isPending: true,
          };
          addStudentToList(pendingEntry);
          setToast({
            tone: "success",
            message: `${name} se agregó sin conexión. Sincronizaremos el registro automáticamente.`,
          });
        }

        setCurrentPage(1);
        setIsAddDialogOpen(false);
        setNewStudentName("");
        setNewStudentMinLevel("");
        setNewStudentMaxLevel("");
      } catch (error) {
        console.error(error);
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo crear el estudiante solicitado.";
        setToast({ tone: "error", message });
      } finally {
        setIsSubmittingStudent(false);
      }
    },
    [
      addStudentToList,
      newStudentMaxLevel,
      newStudentMinLevel,
      newStudentName,
    ],
  );

  const toggleStatusFilter = (key: StudentStatusKey) => {
    setStatusFilters((previous) =>
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
    setStatusFilters([]);
    setFlagFilters([]);
    setLevelFilter("all");
    updateQueryParams(searchTerm, "all");
  };

  const hasActiveFilters =
    statusFilters.length > 0 || flagFilters.length > 0 || levelFilter !== "all";
  const hasSearch = normalizedSearchTerm.length > 0;

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
        statusData={statusTotals}
        flagData={flagTotals}
        onToggleStatus={toggleStatusFilter}
        onToggleFlag={toggleFlagFilter}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <div className="overflow-hidden rounded-[32px] border border-white/70 bg-white/95 shadow-[0_24px_58px_rgba(15,23,42,0.12)]">
        <div className="flex flex-col gap-3 border-b border-brand-ink-muted/10 bg-white/70 px-5 py-4">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
              <label className="flex w-full flex-col gap-1 text-sm font-semibold text-brand-deep sm:max-w-sm">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
                  Buscar estudiante
                </span>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setSearchTerm(nextValue);
                    debouncedUpdateQueryParams(nextValue, levelFilter);
                  }}
                  placeholder="Escribe un nombre para filtrar"
                  className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm leading-relaxed text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
                />
              </label>
              <label className="flex w-full max-w-xs flex-col gap-1 text-sm font-semibold text-brand-deep">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
                  Nivel
                </span>
                <select
                  value={levelFilter}
                  onChange={(event) => {
                    const nextValue = normalizeLevelFilter(event.target.value);
                    setLevelFilter(nextValue);
                    updateQueryParams(searchTerm, nextValue);
                  }}
                  className="w-full rounded-full border border-brand-deep-soft/40 bg-white px-4 py-2 text-sm leading-relaxed text-brand-ink shadow-sm focus:border-brand-teal focus:outline-none"
                >
                  {LEVEL_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {hasSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    updateQueryParams("", levelFilter);
                  }}
                  className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal-soft px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-teal transition hover:-translate-y-[1px] hover:bg-brand-teal-soft/70 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                >
                  Limpiar búsqueda
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsAddDialogOpen(true)}
                className="inline-flex items-center justify-center rounded-full border border-brand-deep-soft bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-deep shadow transition hover:-translate-y-[1px] hover:border-brand-teal hover:bg-brand-teal-soft/60 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
              >
                + Agregar estudiante
              </button>
            </div>
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
              const statusDisplay = getStudentStatusDisplay(student.status);
              const statusDateSource = statusDisplay.showEndDate
                ? statusDisplay.dateField === "graduationDate"
                  ? student.graduationDate
                  : student.contractEnd
                : null;
              const statusDate = statusDateSource
                ? formatStatusDate(statusDateSource)
                : null;
              const positionLabel = formatStudentPosition(student.level, student.lesson);
              return (
                <tr key={student.id} className="align-top transition hover:bg-brand-teal-soft/20">
                  <td className="px-5 py-3 align-top">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-brand-deep whitespace-pre-wrap break-words leading-snug">
                        {student.fullName}
                      </span>
                      {student.isPending ? (
                        <span className="inline-flex w-fit items-center rounded-full bg-brand-orange/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-orange">
                          Sincronizando…
                        </span>
                      ) : null}
                      {positionLabel ? (
                        <span className="text-xs uppercase tracking-wide text-brand-ink-muted">
                          {positionLabel}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${statusDisplay.badgeClassName}`}
                      >
                        {statusDisplay.label}
                      </span>
                      {statusDate ? (
                        <span className="text-xs text-brand-ink-muted">
                          {(statusDisplay.endDateLabel ?? "Finalización") + ": "}
                          {statusDate}
                        </span>
                      ) : null}
                    </div>
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
        <div className="flex flex-col gap-3 border-t border-brand-ink-muted/10 bg-white/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-brand-ink-muted">
            {filteredStudents.length
              ? `Mostrando ${pageStart + 1}–${Math.min(
                  pageStart + PAGE_SIZE,
                  filteredStudents.length,
                )} de ${filteredStudents.length} estudiantes`
              : "Sin resultados que mostrar."}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((previous) => Math.max(1, previous - 1))}
              disabled={clampedPage <= 1}
              className="inline-flex items-center justify-center rounded-full border border-brand-ink-muted/30 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-deep transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              ← Anterior
            </button>
            <span className="text-sm font-semibold text-brand-deep">
              Página {clampedPage} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((previous) => Math.min(totalPages, previous + 1))}
              disabled={clampedPage >= totalPages}
              className="inline-flex items-center justify-center rounded-full border border-brand-ink-muted/30 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-deep transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente →
            </button>
          </div>
        </div>
      </div>

      {isAddDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6 backdrop-blur-sm">
          <form
            onSubmit={handleCreateStudent}
            className="w-full max-w-lg rounded-[28px] border border-white/70 bg-white px-6 py-7 shadow-[0_26px_60px_rgba(15,23,42,0.2)]"
          >
            <header className="mb-4 flex flex-col gap-1 text-left">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-teal">
                Nuevo estudiante
              </span>
              <h2 className="text-xl font-black text-brand-deep">Agregar estudiante</h2>
              <p className="text-sm text-brand-ink-muted">
                Ingresa el nombre y los niveles planificados mínimo y máximo. Podrás completar el resto desde el perfil.
              </p>
            </header>
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-2 text-sm font-semibold uppercase tracking-wide text-brand-deep">
                Nombre completo
                <input
                  type="text"
                  value={newStudentName}
                  onChange={(event) => setNewStudentName(event.target.value)}
                  className="rounded-2xl border border-brand-deep-soft bg-white px-4 py-2 text-base shadow-inner focus:border-brand-teal"
                  required
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-semibold uppercase tracking-wide text-brand-deep">
                  Nivel planificado mínimo
                  <input
                    type="text"
                    value={newStudentMinLevel}
                    onChange={(event) => setNewStudentMinLevel(event.target.value)}
                    className="rounded-2xl border border-brand-deep-soft bg-white px-4 py-2 text-base shadow-inner focus:border-brand-teal"
                    required
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold uppercase tracking-wide text-brand-deep">
                  Nivel planificado máximo
                  <input
                    type="text"
                    value={newStudentMaxLevel}
                    onChange={(event) => setNewStudentMaxLevel(event.target.value)}
                    className="rounded-2xl border border-brand-deep-soft bg-white px-4 py-2 text-base shadow-inner focus:border-brand-teal"
                    required
                  />
                </label>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!isSubmittingStudent) {
                    setIsAddDialogOpen(false);
                  }
                }}
                className="inline-flex items-center justify-center rounded-full border border-brand-ink-muted/20 bg-white px-5 py-2 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow-sm transition hover:-translate-y-[1px] hover:border-brand-teal hover:bg-brand-teal-soft/60 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6]"
                disabled={isSubmittingStudent}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmittingStudent}
                className="inline-flex items-center justify-center rounded-full border border-transparent bg-brand-teal px-6 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:-translate-y-[1px] hover:bg-[#04a890] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmittingStudent ? "Guardando…" : "Agregar"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export { StudentManagementTable };
export default StudentManagementTable;
