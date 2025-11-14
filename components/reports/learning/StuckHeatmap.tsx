import type { StuckHeatmapCell } from "@/types/reports.learning";

const lessonFormatter = new Intl.NumberFormat("es-EC");

function getIntensityStyles(value: number) {
  if (value >= 20) return { container: "bg-rose-600 text-white", text: "text-white/80" };
  if (value >= 10) return { container: "bg-rose-400 text-white", text: "text-white/80" };
  if (value >= 5) return { container: "bg-rose-200 text-rose-900", text: "text-rose-700" };
  if (value > 0) return { container: "bg-rose-50 text-rose-900", text: "text-rose-600" };
  return { container: "bg-slate-100 text-slate-500", text: "text-slate-500" };
}

type Props = {
  cells: StuckHeatmapCell[];
};

export function StuckHeatmap({ cells }: Props) {
  const grouped = cells.reduce<Record<string, StuckHeatmapCell[]>>((acc, cell) => {
    if (!acc[cell.level]) acc[cell.level] = [];
    acc[cell.level].push(cell);
    return acc;
  }, {});

  const levels = Object.keys(grouped).sort((a, b) => a.localeCompare(b, "es", { numeric: true }));

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <header className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Estudiantes estancados</p>
        <h3 className="text-xl font-semibold text-slate-900">Lecciones con mayor fricción</h3>
      </header>
      {!cells.length ? (
        <div className="flex h-40 items-center justify-center text-sm text-slate-500">
          Sin incidentes de estudiantes estancados en los últimos 7 días.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {levels.map((level) => {
            const lessons = grouped[level].sort((a, b) => a.lessonId - b.lessonId).slice(0, 12);
            return (
              <div key={level}>
                <p className="mb-2 text-sm font-semibold text-slate-700">Nivel {level}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {lessons.map((lesson) => {
                    const styles = getIntensityStyles(lesson.stuckCount);
                    return (
                      <div
                        key={`${level}-${lesson.lessonId}`}
                        className={`rounded-xl p-3 text-center text-xs font-semibold ${styles.container}`}
                      >
                        <p className={`text-[10px] uppercase tracking-[0.2em] ${styles.text}`}>
                          {lesson.lessonLabel}
                        </p>
                        <p className="text-lg">{lessonFormatter.format(lesson.stuckCount)}</p>
                        <p className={`text-[10px] uppercase tracking-[0.2em] ${styles.text}`}>estudiantes</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
