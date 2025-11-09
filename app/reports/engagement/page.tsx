import { CoreEngagementSummary } from "@/components/reports/engagement/CoreEngagementSummary";
import { InactivityBreakdown } from "@/components/reports/engagement/InactivityBreakdown";
import { WauMauRatioCards } from "@/components/reports/engagement/WauMauRatioCards";
import { AvgDaysBetweenVisitsCard } from "@/components/reports/engagement/AvgDaysBetweenVisitsCard";
import { WeeklyEngagementTrend } from "@/components/reports/engagement/WeeklyEngagementTrend";
import { EngagementDeclineIndex } from "@/components/reports/engagement/EngagementDeclineIndex";
import { MauRollingTrend } from "@/components/reports/engagement/MauRollingTrend";
import { HourSplitBarsCard } from "@/components/reports/engagement/HourSplitBarsCard";
import { HourlyHeatmap } from "@/components/reports/engagement/HourlyHeatmap";
import { WeekdayTrafficBars } from "@/components/reports/engagement/WeekdayTrafficBars";
import { getEngagementReport } from "@/src/features/reports/engagement/data";

export const revalidate = 600;
export const dynamic = "force-dynamic";

export default async function EngagementPage() {
  const data = await getEngagementReport();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f2f9ff] via-white to-[#f0fdf4]">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-14">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Informes de gestión</span>
            <h1 className="text-3xl font-black text-slate-900 sm:text-[40px]">Panel de engagement</h1>
            <p className="max-w-2xl text-sm text-slate-600">
              Supervisión de actividad, participación y tendencias de asistencia de los alumnos.
            </p>
          </div>
          <div className="text-xs font-medium uppercase tracking-[0.28em] text-slate-400">
            Actualizado: {new Date(data.last_refreshed_at).toLocaleString("es-EC", { timeZone: "America/Guayaquil" })}
          </div>
        </header>

        {/* Section A — Core Engagement KPIs (Snapshot) */}
        
        {/* Module 1: Core Engagement Summary */}
        <CoreEngagementSummary activeCounts={data.active_counts} />

        {/* Module 2: Inactivity Breakdown */}
        <InactivityBreakdown counts={data.inactive_counts} />

        {/* Module 3: WAU / MAU / WAU-MAU Ratio */}
        <WauMauRatioCards metrics={data.wau_mau_metrics} />

        {/* Module 4: Promedio de Días Entre Visitas */}
        <AvgDaysBetweenVisitsCard 
          avgDays={data.avg_between_visits_global}
          medianDays={data.median_between_visits}
        />

        {/* Section B — Engagement Trends */}

        {/* Module 5: Weekly Engagement Trend */}
        <WeeklyEngagementTrend data={data.weekly_engagement_90d} />

        {/* Module 6: Engagement Decline Index (WoW) */}
        <EngagementDeclineIndex wowIndex={data.wow_index} />

        {/* Module 7: Rolling 30-Day Active User Trend */}
        <MauRollingTrend data={data.mau_rolling_90d} />

        {/* Section C — Time Distribution & Behavior Patterns */}

        {/* Module 8: Hour Split 08–12 / 12–17 / 17–20 */}
        <HourSplitBarsCard rows={data.hour_split} />

        {/* Module 9: Tráfico por Hora — Heatmap */}
        <HourlyHeatmap data={data.hourly_heatmap_90d} />

        {/* Module 10: Día de la Semana con Mayor Tráfico */}
        <WeekdayTrafficBars data={data.daily_activity} />
      </main>
    </div>
  );
}
