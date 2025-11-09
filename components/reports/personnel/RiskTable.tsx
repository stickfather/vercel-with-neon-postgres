"use client";

import { useState } from "react";
import type { PersonnelCoverageByHour } from "@/types/personnel";

type RiskTableProps = {
  data: PersonnelCoverageByHour[];
};

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function getStatusChip(status: string, ratio: number, staff: number): {
  label: string;
  colorClass: string;
  severity: number;
} {
  if (staff === 0) {
    return {
      label: "Sin Cobertura",
      colorClass: "bg-rose-600 text-white border-rose-700",
      severity: 4,
    };
  }
  if (ratio > 4.0) {
    return {
      label: "Alto Riesgo",
      colorClass: "bg-rose-100 text-rose-700 border-rose-300",
      severity: 3,
    };
  }
  if (ratio > 2.0) {
    return {
      label: "Atención",
      colorClass: "bg-amber-100 text-amber-700 border-amber-300",
      severity: 2,
    };
  }
  return {
    label: "OK",
    colorClass: "bg-slate-100 text-slate-600 border-slate-300",
    severity: 1,
  };
}

export function RiskTable({ data }: RiskTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Filter to only include non-OK status
  const filteredData = data
    .map((d) => ({
      ...d,
      statusInfo: getStatusChip(
        d.estado_cobertura,
        d.carga_relativa,
        d.minutos_personal
      ),
    }))
    .filter((d) => d.statusInfo.label !== "OK")
    .sort((a, b) => {
      // Sort by severity (highest first), then by ratio (highest first)
      if (b.statusInfo.severity !== a.statusInfo.severity) {
        return b.statusInfo.severity - a.statusInfo.severity;
      }
      return b.carga_relativa - a.carga_relativa;
    });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  if (filteredData.length === 0) {
    return (
      <figure className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <figcaption className="mb-4 flex flex-col gap-1">
          <h2 className="text-base font-semibold text-slate-900 md:text-lg">
            Análisis de Riesgo y Cobertura
          </h2>
          <p className="text-sm text-slate-600">
            Horas que requieren atención (excluyendo estado OK)
          </p>
        </figcaption>
        <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <div className="flex flex-col gap-2">
            <span className="text-2xl">✓</span>
            <p className="text-sm font-semibold text-slate-900">
              Todas las horas tienen cobertura adecuada
            </p>
            <p className="text-xs text-slate-600">
              Ninguna hora requiere atención en este momento
            </p>
          </div>
        </div>
      </figure>
    );
  }

  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <figcaption className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-slate-900 md:text-lg">
          Análisis de Riesgo y Cobertura
        </h2>
        <p className="text-sm text-slate-600">
          Horas que requieren atención (excluyendo estado OK) • Mostrando{" "}
          {filteredData.length} hora{filteredData.length === 1 ? "" : "s"}
        </p>
      </figcaption>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700">Hora</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">
                Estudiantes (min)
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">
                Personal (min)
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">
                Ratio de Carga
              </th>
              <th className="px-4 py-3 font-semibold text-slate-700">
                Estado de Cobertura
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentData.map((row) => (
              <tr
                key={row.hour_of_day}
                className="hover:bg-slate-50 transition"
              >
                <td className="px-4 py-3 font-medium text-slate-900">
                  {formatHour(row.hour_of_day)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                  {row.minutos_estudiantes.toLocaleString("es-EC")}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                  {row.minutos_personal.toLocaleString("es-EC")}
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                  {row.carga_relativa.toFixed(2)}×
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${row.statusInfo.colorClass}`}
                  >
                    {row.statusInfo.label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
          <p className="text-xs text-slate-600">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </figure>
  );
}
