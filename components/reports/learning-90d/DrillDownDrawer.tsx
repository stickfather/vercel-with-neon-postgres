"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type {
  DrillDownSlice,
  StuckStudent,
  DurationSessionDetail,
} from "@/types/learning-panel";

type Props = {
  slice: DrillDownSlice;
  onClose: () => void;
};

export function DrillDownDrawer({ slice, onClose }: Props) {
  const [data, setData] = useState<StuckStudent[] | DurationSessionDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 25;

  useEffect(() => {
    if (slice.type === "none") return;

    async function fetchData() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (slice.type === "stuck_heatmap") {
          params.set("type", "stuck");
          params.set("level", slice.level);
          params.set("lessonName", slice.lesson_name);
        } else if (slice.type === "duration_variance") {
          params.set("type", "duration");
          params.set("level", slice.level);
          params.set("lessonName", slice.lesson_name);
        }

        const response = await fetch(
          `/api/reports/learning-90d/drilldown?${params.toString()}`
        );
        if (!response.ok) throw new Error("Failed to fetch drill-down data");

        const result = await response.json();
        setData(result.data || []);
        setPage(1);
      } catch (error) {
        console.error("Error fetching drill-down data:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [slice]);

  if (slice.type === "none") return null;

  const totalPages = Math.ceil(data.length / perPage);
  const startIdx = (page - 1) * perPage;
  const endIdx = startIdx + perPage;
  const paginatedData = data.slice(startIdx, endIdx);

  const getTitle = () => {
    if (slice.type === "stuck_heatmap") {
      return `${slice.level} • ${slice.lesson_name} — Estudiantes Estancados`;
    } else if (slice.type === "duration_variance") {
      return `${slice.level} • ${slice.lesson_name} — Detalles de Sesión`;
    }
    return "";
  };

  const formatTime = (timeStr: string) => {
    try {
      return format(parseISO(timeStr), "HH:mm", { locale: es });
    } catch {
      return "";
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return format(parseISO(dateStr), "dd MMM", { locale: es });
    } catch {
      return "—";
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[520px] flex-col bg-white shadow-2xl"
        role="dialog"
        aria-labelledby="drawer-title"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 id="drawer-title" className="text-lg font-semibold text-slate-900">
            {getTitle()}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close drawer"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-sm text-slate-500">Cargando...</div>
            </div>
          ) : data.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-sm text-slate-500">No se encontraron datos.</div>
            </div>
          ) : slice.type === "stuck_heatmap" ? (
            <div className="space-y-4">
              {(paginatedData as StuckStudent[]).map((student) => (
                <div
                  key={student.student_id}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{student.full_name}</p>
                      <p className="text-sm text-slate-600">
                        {student.level} • Lección {student.current_seq}
                      </p>
                    </div>
                    {student.inactive_14d && (
                      <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-800">
                        Inactivo 14d+
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-600">
                    <span>Última visita: {formatDate(student.last_seen_date)}</span>
                    {student.stall && (
                      <span className="rounded-full bg-amber-100 px-2 py-1 font-medium text-amber-800">
                        Estancado
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : slice.type === "duration_variance" ? (
            <div className="space-y-4">
              {(paginatedData as DurationSessionDetail[]).map((session, idx) => (
                <div
                  key={`${session.student_id}-${idx}`}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <div className="mb-2">
                    <p className="font-medium text-slate-900">{session.full_name}</p>
                    <p className="text-sm text-slate-600">
                      {session.level} • Lección {session.lesson_seq}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-600">
                    <span className="font-semibold text-slate-900">
                      {session.total_minutes} min
                    </span>
                    <span>
                      {formatDate(session.finished_on)} {formatTime(session.finished_on)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <footer className="border-t border-slate-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </footer>
        )}
      </aside>
    </>
  );
}
