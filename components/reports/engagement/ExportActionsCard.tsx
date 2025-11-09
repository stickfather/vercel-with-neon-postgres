"use client";

import type { EngagementReport } from "@/types/reports.engagement";

type Props = {
  data: EngagementReport;
};

function convertToCSV(data: any[], headers: string[]): string {
  const rows = [headers.join(",")];
  data.forEach((row) => {
    const values = headers.map((header) => {
      const value = row[header];
      if (value === null || value === undefined) return "";
      if (typeof value === "string" && value.includes(",")) {
        return `"${value}"`;
      }
      return String(value);
    });
    rows.push(values.join(","));
  });
  return rows.join("\n");
}

function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function ExportActionsCard({ data }: Props) {
  const handleExport = () => {
    const timestamp = new Date().toISOString().split("T")[0];
    
    // Export inactive roster
    if (data.inactive_roster.length > 0) {
      const csv = convertToCSV(
        data.inactive_roster.map((r) => ({
          student_id: r.student_id,
          full_name: r.full_name || "",
          level: r.level || "",
          last_checkin_time: r.last_checkin_time || "",
          days_since_last_checkin: r.days_since_last_checkin ?? "",
          inactivity_bucket: r.inactivity_bucket,
        })),
        ["student_id", "full_name", "level", "last_checkin_time", "days_since_last_checkin", "inactivity_bucket"]
      );
      downloadCSV(`inactive-roster-${timestamp}.csv`, csv);
    }

    // Export at-risk students
    if (data.at_risk_students.length > 0) {
      const csv = convertToCSV(
        data.at_risk_students.map((r) => ({
          student_id: r.student_id,
          full_name: r.full_name || "",
          level: r.level || "",
          days_since_last_checkin: r.days_since_last_checkin ?? "",
          avg_days_between_visits: r.avg_days_between_visits ?? "",
          sessions_30d: r.sessions_30d,
        })),
        ["student_id", "full_name", "level", "days_since_last_checkin", "avg_days_between_visits", "sessions_30d"]
      );
      downloadCSV(`at-risk-students-${timestamp}.csv`, csv);
    }

    // Export dual-risk students
    if (data.dual_risk_students.length > 0) {
      const csv = convertToCSV(
        data.dual_risk_students.map((r) => ({
          student_id: r.student_id,
          full_name: r.full_name || "",
          level: r.level || "",
          engagement_issue: r.engagement_issue,
          learning_issue: r.learning_issue,
          days_since_last_checkin: r.days_since_last_checkin ?? "",
        })),
        ["student_id", "full_name", "level", "engagement_issue", "learning_issue", "days_since_last_checkin"]
      );
      downloadCSV(`dual-risk-students-${timestamp}.csv`, csv);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <header className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">
          Exportar + Notas de Gestión
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Exportar datos para seguimiento y acciones de gestión
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <button
          onClick={handleExport}
          className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
        >
          📥 Exportar CSV (Todas las Tablas)
        </button>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-600">
            El CSV incluirá: Roster Inactivos, Estudiantes en Riesgo, y Estudiantes de Riesgo Dual.
            Los archivos se descargarán automáticamente.
          </p>
        </div>
      </div>
    </section>
  );
}
