"use client";

import { useEffect, useState } from "react";

import { CoverageGapTable } from "@/components/reports/personnel/CoverageGapTable";
import { PeakCoverageChart } from "@/components/reports/personnel/PeakCoverageChart";
import { StaffingHeatmap } from "@/components/reports/personnel/StaffingHeatmap";
import { StudentLoadGaugeCard } from "@/components/reports/personnel/StudentLoadGaugeCard";
import { StudentLoadTable } from "@/components/reports/personnel/StudentLoadTable";
import { TeacherUtilizationChart } from "@/components/reports/personnel/TeacherUtilizationChart";
import type { PersonnelReportResponse } from "@/types/personnel";

export function PersonnelPanelClient() {
  const [data, setData] = useState<PersonnelReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/reports/personnel");
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result?.error || "No pudimos cargar el reporte de personal");
        }
        setData(result as PersonnelReportResponse);
        setError(null);
      } catch (err) {
        console.error("Error fetching personnel panel data:", err);
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2].map((key) => (
            <div key={key} className="h-72 animate-pulse rounded-2xl bg-slate-200/60" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2].map((key) => (
            <div key={key} className="h-64 animate-pulse rounded-2xl bg-slate-200/60" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2].map((key) => (
            <div key={key} className="h-72 animate-pulse rounded-2xl bg-slate-200/60" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <h3 className="mb-2 text-lg font-semibold text-rose-900">No pudimos cargar los datos</h3>
          <p className="mb-4 text-sm text-rose-800">{error || "No recibimos datos del servidor."}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            Reintentar
          </button>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h3 className="mb-2 text-sm font-semibold text-amber-900">ℹ️ Nota para administradores</h3>
          <p className="text-xs text-amber-800">
            Este panel usa las vistas final.personnel_* de la capa de analytics. Verifica que estén creadas y materializadas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {data.fallback && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Algunos indicadores están en modo seguro mientras se recalculan las vistas final.personnel_*.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <StaffingHeatmap cells={data.staffingMixByHour} />
        <PeakCoverageChart data={data.peakCoverage} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StudentLoadGaugeCard gauge={data.studentLoadGauge} />
        <StudentLoadTable rows={data.studentLoadPerTeacher} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CoverageGapTable
          title="Horas subdotadas (críticas)"
          rows={data.understaffedHours}
          variant="under"
        />
        <CoverageGapTable
          title="Horas sobredotadas (exceso de personal)"
          rows={data.overstaffedHours}
          variant="over"
        />
      </div>

      <TeacherUtilizationChart rows={data.teacherUtilization} />
    </div>
  );
}
