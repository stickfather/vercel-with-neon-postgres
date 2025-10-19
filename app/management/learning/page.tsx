import { Suspense } from "react";

import { LearningDashboard } from "@/components/management/learning/LearningDashboard";
import { getLearningDashboardData } from "src/features/management/learning/data/learning.read";

const TREND_WINDOWS = [13, 26, 52] as const;

type TrendWindow = (typeof TREND_WINDOWS)[number];

type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  searchParams?: Promise<SearchParams>;
};

export const revalidate = 60;

function parseLevels(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const items = Array.isArray(value) ? value.flatMap((item) => item.split(",")) : value.split(",");
  return items
    .map((item) => item.trim().toUpperCase())
    .filter((item) => item.length > 0);
}

function parseTrendWindow(value: string | string[] | undefined): TrendWindow {
  if (!value) return 26;
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  if (TREND_WINDOWS.includes(parsed as TrendWindow)) {
    return parsed as TrendWindow;
  }
  return 26;
}

export default async function LearningManagementPage({ searchParams }: PageProps) {
  const resolvedSearchParams = (searchParams ? await searchParams : {}) as SearchParams;
  const levelParams = parseLevels(resolvedSearchParams.levels);
  const trendWindow = parseTrendWindow(resolvedSearchParams.window);

  const data = await getLearningDashboardData(levelParams);
  const normalizedLevels = levelParams.filter((level) => data.availableLevels.includes(level));

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f2f8ff] via-white to-[#ecfdf5]">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-10 md:px-10 lg:px-14">
        <Suspense fallback={<div className="rounded-3xl border border-slate-200 bg-white/90 p-6">Cargando...</div>}>
          <LearningDashboard
            data={data}
            initialLevels={normalizedLevels}
            initialTrendWindow={trendWindow}
          />
        </Suspense>
      </main>
    </div>
  );
}
