import { EngagementHeaderTiles } from "@/components/reports/engagement/EngagementHeaderTiles";
import { DailyActivityChart } from "@/components/reports/engagement/DailyActivityChart";
import { AvgBetweenVisitsCard } from "@/components/reports/engagement/AvgBetweenVisitsCard";
import { ActiveFunnelCard } from "@/components/reports/engagement/ActiveFunnelCard";
import { InactiveCohortsCard } from "@/components/reports/engagement/InactiveCohortsCard";
import { HourSplitCard } from "@/components/reports/engagement/HourSplitCard";
import { getEngagementReport } from "@/src/features/reports/engagement/data";

export const revalidate = 600;
export const dynamic = "force-dynamic";

export default async function EngagementPage() {
  const data = await getEngagementReport();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f2f9ff] via-white to-[#f0fdf4]">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-14">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Informes de gestión</span>
            <h1 className="text-3xl font-black text-slate-900 sm:text-[40px]">Panel de engagement</h1>
            <p className="max-w-2xl text-sm text-slate-600">
              Supervisión de actividad, participación y tendencias de asistencia de los alumnos.
            </p>
          </div>
          <div className="text-xs font-medium uppercase tracking-[0.28em] text-slate-400">
            Actualizado: {new Date(data.last_refreshed_at).toLocaleString("es-EC")}
          </div>
        </header>

        {/* Row 1: Snapshot tiles */}
        <EngagementHeaderTiles
          activeCounts={data.active_counts}
          wowIndex={data.wow_index}
        />

        {/* Row 2: Trend + Avg gap */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <DailyActivityChart data={data.daily_activity} />
          <AvgBetweenVisitsCard
            global={data.avg_between_visits_global}
            perLevel={data.avg_between_visits_by_level}
          />
        </section>

        {/* Row 3: Funnels & cohorts */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ActiveFunnelCard
            a7={data.active_counts.active_7d}
            a14={data.active_counts.active_14d}
            a30={data.active_counts.active_30d}
            a180={data.active_counts.active_180d}
          />
          <InactiveCohortsCard counts={data.inactive_counts} />
        </section>

        {/* Row 4: Hour split */}
        <HourSplitCard rows={data.hour_split} />
      </main>
    </div>
  );
}
