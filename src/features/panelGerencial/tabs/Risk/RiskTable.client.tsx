"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { AtRiskRow } from "../../data/risk.read";

type RiskTableProps = {
  rows: AtRiskRow[];
  initialLevel?: string;
  initialBand?: string;
};

type FiltersState = {
  offpace: boolean;
  inactive: boolean;
  stall: boolean;
};

const numberFormatter = new Intl.NumberFormat("es-EC");
const compactFormatter = new Intl.NumberFormat("es-EC", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const decimalFormatter = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatBoolean(value: boolean | null | undefined) {
  if (value === null || value === undefined) return "--";
  return value ? "Sí" : "No";
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "--";
  return numberFormatter.format(value);
}

function formatCompact(value: number | null | undefined) {
  if (value === null || value === undefined) return "--";
  return compactFormatter.format(value);
}

function formatDecimal(value: number | null | undefined) {
  if (value === null || value === undefined) return "--";
  return decimalFormatter.format(value);
}

const pageSize = 50;

export default function RiskTable({ rows, initialLevel, initialBand }: RiskTableProps) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FiltersState>({ offpace: false, inactive: false, stall: false });
  const [levelFilter, setLevelFilter] = useState<string | null>(initialLevel ?? null);
  const [bandFilter, setBandFilter] = useState<string | null>(initialBand ?? null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setLevelFilter(initialLevel ?? null);
  }, [initialLevel]);

  useEffect(() => {
    setBandFilter(initialBand ?? null);
  }, [initialBand]);

  useEffect(() => {
    setPage(0);
  }, [search, filters.offpace, filters.inactive, filters.stall, levelFilter, bandFilter]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (filters.offpace && row.on_pace !== false) return false;
      if (filters.inactive && row.inactive_14d !== true) return false;
      if (filters.stall && row.stall_flag !== true) return false;
      if (levelFilter && row.level_code !== levelFilter) return false;
      if (bandFilter && row.engagement_band !== bandFilter) return false;
      if (normalizedSearch) {
        const haystack = `${row.student_id ?? ""}`.toLowerCase();
        if (!haystack.includes(normalizedSearch)) return false;
      }
      return true;
    });
  }, [rows, filters, levelFilter, bandFilter, search]);

  const totalPages = Math.max(Math.ceil(filteredRows.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages - 1);
  const paginatedRows = filteredRows.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  const handleToggle = (key: keyof FiltersState) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExport = () => {
    const header = [
      "student_id",
      "level_code",
      "on_pace",
      "inactive_14d",
      "stall_flag",
      "lei_30d",
      "lei_ratio",
      "minutes_30d",
      "days_since_last",
      "lessons_remaining",
      "forecast_months_to_finish",
      "risk_score",
      "engagement_band",
    ];
    const rowsCsv = filteredRows.map((row) =>
      header
        .map((column) => {
          const value = (row as Record<string, unknown>)[column];
          if (value === null || value === undefined) return "";
          return String(value);
        })
        .join(","),
    );
    const csv = [header.join(","), ...rowsCsv].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "top_en_riesgo.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {([
            { key: "offpace", label: "Off-pace" },
            { key: "inactive", label: "Inactivo ≥14d" },
            { key: "stall", label: "Estancamiento" },
          ] as Array<{ key: keyof FiltersState; label: string }>).map((filter) => {
            const active = filters[filter.key];
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => handleToggle(filter.key)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                  active
                    ? "bg-brand-deep text-white shadow"
                    : "border border-brand-ink/20 bg-white text-brand-ink-muted hover:border-brand-ink/40"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por ID"
              className="w-48 rounded-full border border-brand-ink/20 bg-white px-4 py-2 text-sm outline-none ring-brand-deep/30 focus:ring"
            />
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="rounded-full border border-brand-ink/10 bg-white px-4 py-2 text-sm font-medium text-brand-deep shadow-sm transition hover:border-brand-deep/40"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {levelFilter ? (
          <FilterPill label={`Nivel: ${levelFilter}`} onClear={() => setLevelFilter(null)} />
        ) : null}
        {bandFilter ? (
          <FilterPill label={`Banda: ${bandFilter.toUpperCase()}`} onClear={() => setBandFilter(null)} />
        ) : null}
        {levelFilter || bandFilter ? (
          <button
            type="button"
            onClick={() => {
              setLevelFilter(null);
              setBandFilter(null);
            }}
            className="text-xs font-medium text-brand-ink-muted hover:text-brand-deep"
          >
            Limpiar filtros
          </button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-brand-ink/10">
        <table className="min-w-full divide-y divide-brand-ink/10 text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-brand-ink-muted">
            <tr>
              <th className="px-4 py-3">Estudiante</th>
              <th className="px-4 py-3">Nivel</th>
              <th className="px-4 py-3">Off-pace</th>
              <th className="px-4 py-3">Inactivo ≥14d</th>
              <th className="px-4 py-3">Estancamiento</th>
              <th className="px-4 py-3">LEI</th>
              <th className="px-4 py-3">LEI ratio</th>
              <th className="px-4 py-3">Minutos 30d</th>
              <th className="px-4 py-3">Días sin asistir</th>
              <th className="px-4 py-3">Lecciones restantes</th>
              <th className="px-4 py-3">Pronóstico (meses)</th>
              <th className="px-4 py-3">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-ink/10 bg-white">
            {paginatedRows.length ? (
              paginatedRows.map((row) => {
                const ratioValue = row.lei_ratio === null || row.lei_ratio === undefined ? null : Number(row.lei_ratio);
                const ratioColor = getRatioColor(ratioValue, row.inactive_14d === true);
                const forecastValue =
                  row.forecast_months_to_finish === null || row.forecast_months_to_finish === undefined
                    ? null
                    : Number(row.forecast_months_to_finish);
                const displayForecast = forecastValue === null ? "--" : forecastValue > 12 ? "12+" : formatDecimal(forecastValue);
                const offpaceValue =
                  row.on_pace === null || row.on_pace === undefined ? null : row.on_pace === false;
                return (
                  <tr key={row.student_id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/students/${encodeURIComponent(row.student_id)}`}
                        className="font-semibold text-brand-deep hover:underline"
                      >
                        #{row.student_id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-brand-deep">{row.level_code ?? "--"}</td>
                    <td className="px-4 py-3">{formatBoolean(offpaceValue)}</td>
                    <td className="px-4 py-3">{formatBoolean(row.inactive_14d)}</td>
                    <td className="px-4 py-3">{formatBoolean(row.stall_flag)}</td>
                    <td className="px-4 py-3">{formatDecimal(row.lei_30d)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold uppercase ${ratioColor}`}
                      >
                        {ratioValue === null ? "--" : formatDecimal(ratioValue)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatCompact(row.minutes_30d)}</td>
                    <td className="px-4 py-3">{formatNumber(row.days_since_last)}</td>
                    <td className="px-4 py-3">{formatNumber(row.lessons_remaining)}</td>
                    <td className="px-4 py-3">{displayForecast}</td>
                    <td className="px-4 py-3 font-semibold text-brand-deep">
                      {row.risk_score === null || row.risk_score === undefined
                        ? "--"
                        : decimalFormatter.format(Number(row.risk_score))}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-sm text-brand-ink-muted">
                  Sin alumnos en riesgo bajo los criterios actuales.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredRows.length > pageSize ? (
        <div className="flex items-center justify-between text-xs text-brand-ink-muted">
          <span>
            Página {currentPage + 1} de {totalPages} ({filteredRows.length} alumnos)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              disabled={currentPage === 0}
              className="rounded-full border border-brand-ink/20 bg-white px-3 py-1 font-medium text-brand-ink-muted disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages - 1))}
              disabled={currentPage >= totalPages - 1}
              className="rounded-full border border-brand-ink/20 bg-white px-3 py-1 font-medium text-brand-ink-muted disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterPill({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-brand-deep/10 px-3 py-1 text-xs font-medium text-brand-deep">
      {label}
      <button
        type="button"
        onClick={onClear}
        className="text-brand-deep/70 hover:text-brand-deep"
        aria-label={`Eliminar filtro ${label}`}
      >
        ×
      </button>
    </span>
  );
}

function getRatioColor(ratio: number | null, isInactive: boolean) {
  if (isInactive) return "bg-rose-500/15 text-rose-600";
  if (ratio === null) return "bg-amber-500/15 text-amber-600";
  if (ratio < 0.6) return "bg-rose-500/15 text-rose-600";
  if (ratio < 1) return "bg-amber-500/15 text-amber-600";
  return "bg-emerald-500/15 text-emerald-600";
}
