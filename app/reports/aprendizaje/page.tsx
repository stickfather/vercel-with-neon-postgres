import { LearningHeaderTiles } from "@/components/reports/learning/LearningHeaderTiles";
import { DaysInLevelBars } from "@/components/reports/learning/DaysInLevelBars";
import { DurationVariance } from "@/components/reports/learning/DurationVariance";
import { SpeedBuckets } from "@/components/reports/learning/SpeedBuckets";
import { StuckHeatmap } from "@/components/reports/learning/StuckHeatmap";
import { VelocityByLevel } from "@/components/reports/learning/VelocityByLevel";
import { getLearningReport } from "@/src/features/reports/learning/data";

export const revalidate = 600;

export default async function LearningPage() {
  const data = await getLearningReport();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f2f9ff] via-white to-[#f0fdf4]">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-14">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Informes de gestión</span>
            <h1 className="text-3xl font-black text-slate-900 sm:text-[40px]">Panel de aprendizaje</h1>
            <p className="max-w-2xl text-sm text-slate-600">
              Supervisión de eficiencia, velocidad de avance y alertas de aprendizaje.
            </p>
          </div>
          <div className="text-xs font-medium uppercase tracking-[0.28em] text-slate-400">
            Actualizado: {new Date(data.last_refreshed_at).toLocaleString("es-EC")}
          </div>
        </header>

        <LearningHeaderTiles
          leiTrend={data.lei_trend}
          leiTrendPctChange={data.lei_trend_pct_change_30d}
          transitionsTotal={data.transitions_30d_total}
          transitionsSeries={data.transitions_30d_series}
          daysSinceMedian={data.days_since_progress.global_median}
          atRiskCount={data.at_risk.length}
        />

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <SpeedBuckets buckets={data.speed_buckets} />
          <VelocityByLevel rows={data.velocity_per_level} />
        </section>

        <StuckHeatmap cells={data.stuck_heatmap} />

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <DaysInLevelBars rows={data.days_in_level} />
          <DurationVariance rows={data.duration_variance} />
        </section>
      </main>
    </div>
  );
}
