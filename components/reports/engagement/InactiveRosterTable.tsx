"use client";

import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { InactiveRosterRow } from "@/types/reports.engagement";

const decimalFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

type Props = {
  data: InactiveRosterRow[];
};

const bucketLabels: Record<InactiveRosterRow["inactivity_bucket"], string> = {
  inactive_7d: "7+",
  inactive_14d: "14+",
  dormant_30d: "30+",
  long_term_inactive_180d: "180+",
  active_recent: "Activo",
};

const bucketColors: Record<InactiveRosterRow["inactivity_bucket"], string> = {
  inactive_7d: "bg-amber-100 text-amber-700 border-amber-300",
  inactive_14d: "bg-rose-100 text-rose-600 border-rose-300",
  dormant_30d: "bg-rose-200 text-rose-700 border-rose-400",
  long_term_inactive_180d: "bg-rose-300 text-rose-800 border-rose-500",
  active_recent: "bg-emerald-100 text-emerald-700 border-emerald-300",
};

export function InactiveRosterTable({ data }: Props) {
  const [sortBy, setSortBy] = useState<"days" | "name">("days");
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(0);
  const perPage = 20;

  const sortedData = useMemo(() => {
    const sorted = [...data];
    if (sortBy === "days") {
      sorted.sort((a, b) => {
        const aVal = a.days_since_last_checkin ?? -1;
        const bVal = b.days_since_last_checkin ?? -1;
        return sortDesc ? bVal - aVal : aVal - bVal;
      });
    } else {
      sorted.sort((a, b) => {
        const aName = a.full_name || "";
        const bName = b.full_name || "";
        return sortDesc ? bName.localeCompare(aName, "es") : aName.localeCompare(bName, "es");
      });
    }
    return sorted;
  }, [data, sortBy, sortDesc]);

  const paginatedData = useMemo(() => {
    const start = page * perPage;
    return sortedData.slice(start, start + perPage);
  }, [sortedData, page]);

  const totalPages = Math.ceil(sortedData.length / perPage);

  const handleSort = (field: "days" | "name") => {
    if (sortBy === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(field);
      setSortDesc(true);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <header className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900">
          Lista de inactivos
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Alumnos inactivos por días sin visitar (total: {data.length})
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th
                className="cursor-pointer px-4 py-3 text-left font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => handleSort("name")}
              >
                Alumno {sortBy === "name" && (sortDesc ? "↓" : "↑")}
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                Último check-in
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-right font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => handleSort("days")}
              >
                Días sin visitar {sortBy === "days" && (sortDesc ? "↓" : "↑")}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-slate-700">
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row) => (
              <tr key={row.student_id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-900">
                  {row.full_name || `Alumno ${row.student_id}`}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {row.last_checkin_time
                    ? format(parseISO(row.last_checkin_time), "d MMM, HH:mm", { locale: es })
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right text-slate-900">
                  {row.days_since_last_checkin !== null
                    ? decimalFormatter.format(row.days_since_last_checkin)
                    : "—"}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${
                      bucketColors[row.inactivity_bucket]
                    }`}
                  >
                    {bucketLabels[row.inactivity_bucket]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Página {page + 1} de {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page === totalPages - 1}
              className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
