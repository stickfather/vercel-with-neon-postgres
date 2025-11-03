"use client";

import { useEffect, useMemo, useState } from "react";

import { EphemeralToast } from "@/components/ui/ephemeral-toast";
import { FullScreenModal } from "@/components/ui/full-screen-modal";
import type { StuckHeatCell, StuckStudent } from "@/types/reports.learning";

const integerFormatter = new Intl.NumberFormat("es-EC");

function getCellClasses(count: number, max: number) {
  if (count <= 0) {
    return "bg-slate-100 text-slate-400";
  }
  const ratio = max > 0 ? count / max : 0;
  if (ratio >= 0.66) return "bg-rose-500 text-white";
  if (ratio >= 0.33) return "bg-amber-500 text-white";
  return "bg-emerald-500 text-white";
}

type Props = {
  cells: StuckHeatCell[];
};

type SelectedCell = {
  level: string;
  current_seq: number;
  stuck_count: number;
};

export function StuckHeatmap({ cells }: Props) {
  const [selected, setSelected] = useState<SelectedCell | null>(null);
  const [students, setStudents] = useState<StuckStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) return undefined;
    const { level, current_seq } = selected;
    let cancelled = false;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/reports/learning/stuck-students?level=${encodeURIComponent(level)}&seq=${current_seq}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error("No se pudo cargar la lista");
        }
        const payload = (await response.json()) as { students?: StuckStudent[] };
        if (!cancelled) {
          setStudents(payload.students ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error al cargar alumnos estancados", err);
          setError("No se pudo cargar. Reintentar.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selected]);

  const grouped = useMemo(() => {
    const levelMap = new Map<string, StuckHeatCell[]>();
    cells.forEach((cell) => {
      const list = levelMap.get(cell.level) ?? [];
      list.push(cell);
      levelMap.set(cell.level, list);
    });
    levelMap.forEach((list, level) => {
      list.sort((a, b) => a.current_seq - b.current_seq);
      levelMap.set(level, list);
    });
    return levelMap;
  }, [cells]);

  const levels = useMemo(
    () => Array.from(grouped.keys()).sort((a, b) => a.localeCompare(b, "es", { numeric: true })),
    [grouped],
  );

  const maxCount = useMemo(() => {
    if (!cells.length) return 0;
    return Math.max(...cells.map((cell) => cell.stuck_count));
  }, [cells]);

  const handleClose = () => {
    setSelected(null);
    setStudents([]);
  };

  if (!cells.length) {
    return (
      <section className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200/70 bg-white/95 p-6 text-center text-sm text-slate-500">
        <h3 className="text-base font-semibold text-slate-600">Alumnos estancados por lección (últimos 7 días)</h3>
        <p>No hay registros recientes de alumnos estancados.</p>
      </section>
    );
  }

  return (
    <section className="flex h-full flex-col gap-5 rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      {error ? (
        <EphemeralToast message={error} tone="error" onDismiss={() => setError(null)} />
      ) : null}
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-slate-800">Alumnos estancados por lección (últimos 7 días)</h3>
          <p className="text-sm text-slate-500">Activos en 7 días sin completar lección en ≥14 días.</p>
        </div>
        <span className="text-xs text-slate-400" title="Activos en 7 días sin completar lección en ≥14 días.">
          ℹ
        </span>
      </header>
      <div className="flex flex-col gap-4">
        {levels.map((level) => {
          const levelCells = grouped.get(level) ?? [];
          return (
            <div key={level} className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Nivel {level}</span>
              <div className="flex flex-wrap gap-2">
                {levelCells.map((cell) => {
                  const classes = getCellClasses(cell.stuck_count, maxCount);
                  const label = `L${cell.current_seq}`;
                  const title = `${cell.stuck_count} alumno${cell.stuck_count === 1 ? "" : "s"} estancado${cell.stuck_count === 1 ? "" : "s"}`;
                  return (
                    <button
                      key={`${level}-${cell.current_seq}`}
                      type="button"
                      disabled={cell.stuck_count === 0}
                      onClick={() =>
                        setSelected({ level, current_seq: cell.current_seq, stuck_count: cell.stuck_count })
                      }
                      title={title}
                      className={`flex min-w-[72px] flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${classes} ${cell.stuck_count === 0 ? "cursor-not-allowed opacity-60" : "hover:scale-[1.03]"}`}
                    >
                      <span>{label}</span>
                      <span className="text-[11px] uppercase tracking-[0.2em]">{integerFormatter.format(cell.stuck_count)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <FullScreenModal
        open={Boolean(selected)}
        onClose={handleClose}
        title={selected ? `Alumnos estancados en ${selected.level} · L${selected.current_seq}` : ""}
        description="Lista de estudiantes activos sin progreso reciente."
      >
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-slate-500">Cargando…</div>
        ) : students.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">Sin alumnos registrados en este punto.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  <th className="py-2 pr-3">Nombre</th>
                  <th className="py-2 pr-3">Última vez visto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {students.map((student) => {
                  const lastSeen = student.last_seen_date
                    ? new Date(student.last_seen_date).toLocaleDateString("es-EC")
                    : "—";
                  return (
                    <tr key={student.student_id} className="text-slate-700">
                      <td className="py-2 pr-3 font-medium">{student.full_name}</td>
                      <td className="py-2 pr-3">{lastSeen}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </FullScreenModal>
    </section>
  );
}
