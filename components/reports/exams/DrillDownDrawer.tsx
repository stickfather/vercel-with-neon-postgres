"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import type { ExamCompletedExam } from "@/types/exams";

type Props = {
  isOpen: boolean;
  title: string;
  weekStart?: string;
  level?: string;
  examType?: string;
  onClose: () => void;
};

export function DrillDownDrawer({
  isOpen,
  title,
  weekStart,
  level,
  examType,
  onClose,
}: Props) {
  const [exams, setExams] = useState<ExamCompletedExam[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 25;

  useEffect(() => {
    if (!isOpen) return;

    async function fetchExams() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (weekStart) params.set("weekStart", weekStart);
        if (level) params.set("level", level);
        if (examType) params.set("examType", examType);

        const response = await fetch(
          `/api/reports/exams/drilldown?${params.toString()}`,
        );
        if (!response.ok) throw new Error("Failed to fetch drill-down data");

        const data = await response.json();
        setExams(data.exams || []);
        setPage(1);
      } catch (error) {
        console.error("Error fetching drill-down data:", error);
        setExams([]);
      } finally {
        setLoading(false);
      }
    }

    fetchExams();
  }, [isOpen, weekStart, level, examType]);

  if (!isOpen) return null;

  const totalPages = Math.ceil(exams.length / perPage);
  const startIdx = (page - 1) * perPage;
  const endIdx = startIdx + perPage;
  const paginatedExams = exams.slice(startIdx, endIdx);

  const formatTime = (timeStr: string) => {
    try {
      return format(parseISO(timeStr), "HH:mm");
    } catch {
      return "";
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
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close drawer"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-sm text-slate-500">Loading...</div>
            </div>
          ) : exams.length === 0 ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-sm text-slate-500">No exams found.</div>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-slate-600">
                Showing {startIdx + 1}–{Math.min(endIdx, exams.length)} of{" "}
                {exams.length} exams
              </p>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-2 py-2 text-left font-semibold text-slate-700">
                      Student
                    </th>
                    <th className="px-2 py-2 text-left font-semibold text-slate-700">
                      Type
                    </th>
                    <th className="px-2 py-2 text-left font-semibold text-slate-700">
                      Nivel
                    </th>
                    <th className="px-2 py-2 text-left font-semibold text-slate-700">
                      Hora
                    </th>
                    <th className="px-2 py-2 text-right font-semibold text-slate-700">
                      Puntuación
                    </th>
                    <th className="px-2 py-2 text-center font-semibold text-slate-700">
                      Aprobado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedExams.map((exam, idx) => (
                    <tr
                      key={`${exam.exam_id}-${idx}`}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-2 py-3 text-slate-900">
                        {exam.full_name}
                      </td>
                      <td className="px-2 py-3 text-slate-700">
                        {exam.exam_type}
                      </td>
                      <td className="px-2 py-3 text-slate-700">{exam.level}</td>
                      <td className="px-2 py-3 text-slate-700">
                        {formatTime(exam.time_scheduled_local)}
                      </td>
                      <td className="px-2 py-3 text-right font-medium text-slate-900">
                        {exam.score !== null ? exam.score.toFixed(0) : "—"}
                      </td>
                      <td className="px-2 py-3 text-center">
                        {exam.is_passed ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                            ✓
                          </span>
                        ) : (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                            ✗
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Footer with Pagination */}
        {!loading && exams.length > perPage && (
          <footer className="border-t border-slate-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
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
