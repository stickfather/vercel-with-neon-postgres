"use client";

import { useEffect, useState } from "react";
import { KpiStrip } from "./KpiStrip";
import { LoadCurve } from "./LoadCurve";
import { LoadRatioBars } from "./LoadRatioBars";
import { BandTiles } from "./BandTiles";
import { RiskTable } from "./RiskTable";
import { ManagerNotes } from "./ManagerNotes";
import type { PersonnelPanelData } from "@/types/personnel";

export function PersonnelPanelClient() {
  const [data, setData] = useState<PersonnelPanelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/reports/personnel");
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || "Failed to fetch personnel data"
          );
        }
        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        console.error("Error fetching personnel panel data:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        {/* KPI Strip Skeleton */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-200/60" />
          ))}
        </div>
        
        {/* Charts Skeleton */}
        <div className="h-80 animate-pulse rounded-2xl bg-slate-200/60" />
        
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-2xl bg-slate-200/60" />
          <div className="h-80 animate-pulse rounded-2xl bg-slate-200/60" />
        </div>
        
        {/* Table Skeleton */}
        <div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <h3 className="mb-2 text-lg font-semibold text-rose-900">
            We couldn't load the data
          </h3>
          <p className="mb-4 text-sm text-rose-800">
            {error || "No data received from the server."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
        
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h3 className="mb-2 text-sm font-semibold text-amber-900">
            ℹ️ Note for administrators
          </h3>
          <p className="text-xs text-amber-800">
            This panel requires the mgmt.personnel_* database views to be created and populated with data.
            If you've just deployed, you may need to run database migrations first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* MODULE 2: At a Glance KPI Strip */}
      <KpiStrip kpiSnapshot={data.kpiSnapshot} />

      {/* MODULE 3: Staffing Load Curve (Hero Chart) */}
      <LoadCurve data={data.coverageByHour} />

      {/* MODULE 4 & 5: Student Load + Band Tiles */}
      <div className="grid gap-6 lg:grid-cols-2">
        <LoadRatioBars data={data.studentLoad} />
        <BandTiles data={data.staffingMixByBand} />
      </div>

      {/* MODULE 6: Risk & Coverage Table */}
      <RiskTable data={data.coverageByHour} />

      {/* MODULE 7: AI Manager Notes */}
      <ManagerNotes
        summary={data.managerNotes.summary}
        bullets={data.managerNotes.bullets}
      />
    </div>
  );
}
