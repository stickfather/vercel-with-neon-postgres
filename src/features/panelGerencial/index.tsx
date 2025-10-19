import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import Tabs, { TabSlug, isValidTabSlug } from "./Tabs";
import { CardsSkeleton, ChartsSkeleton, FullPanelSkeleton } from "./Skeleton";
import ErrorState from "./ErrorState";
import OverviewPanel from "./tabs/Overview/Overview";
import ProgressPanel from "./tabs/Progress/Progress";
import EngagementPanel from "./tabs/Engagement/Engagement";
import RiskPanel from "./tabs/Risk/Risk";
import FinancesPanel from "./tabs/Finances/Finances";
import OpsPanel from "./tabs/Ops/Ops";
import ExamsPanel from "./tabs/Exams/Exams";

export const revalidate = 60;

const TREND_WINDOWS = [13, 26, 52] as const;
type TrendWindow = (typeof TREND_WINDOWS)[number];

function parseLevelsParam(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const items = Array.isArray(value) ? value : [value];
  return items
    .flatMap((item) => item.split(","))
    .map((item) => item.trim().toUpperCase())
    .filter((item) => item.length > 0);
}

function getSelectedLevels(searchParams: Record<string, string | string[] | undefined>) {
  const levelsParam = parseLevelsParam(searchParams.levels);
  if (levelsParam.length) return levelsParam;
  const fallback = parseLevelsParam(searchParams.level);
  if (fallback.length) return [fallback[0]];
  return [];
}

function getSelectedLevel(searchParams: Record<string, string | string[] | undefined>) {
  const levels = getSelectedLevels(searchParams);
  return levels.length ? levels[0] : null;
}

function getSelectedBand(searchParams: Record<string, string | string[] | undefined>) {
  const value = searchParams.band;
  if (Array.isArray(value)) return value[0];
  return value ?? null;
}

type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  params?: Promise<{ segments?: string[] }>;
  searchParams?: Promise<SearchParams>;
};

export default async function PanelGerencialPage({ params, searchParams }: PageProps) {
  const resolvedParams = (params ? await params : {}) as { segments?: string[] };
  const resolvedSearchParams = (searchParams ? await searchParams : {}) as SearchParams;

  const tabParam = resolvedParams.segments?.[0];
  if (!tabParam) {
    redirect("/panel-gerencial/overview");
  }

  if (!isValidTabSlug(tabParam)) {
    redirect("/panel-gerencial/overview");
  }

  const activeTab = tabParam as TabSlug;
  const selectedLevel = getSelectedLevel(resolvedSearchParams);
  const selectedLevels = getSelectedLevels(resolvedSearchParams);
  const selectedBand = getSelectedBand(resolvedSearchParams);
  const trendWindow = getTrendWindow(resolvedSearchParams);

  const content = renderActiveTab(activeTab, {
    selectedLevel,
    selectedLevels,
    selectedBand,
    trendWindow,
  });

  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-br from-[#f8fbff] via-white to-[#f1fffb]">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_#d8f4ff_0%,_transparent_55%)]" aria-hidden="true" />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-10 md:px-10 lg:px-14">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-ink-muted">
              Informes de gestión
            </span>
            <h1 className="text-3xl font-black text-brand-deep sm:text-[40px]">Paneles analíticos de la escuela</h1>
          </div>
          <Link
            href="/administracion"
            className="inline-flex items-center justify-center rounded-full bg-brand-deep px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-deep/90"
          >
            Volver a Administración
          </Link>
        </header>

        <Tabs activeTab={activeTab} />

        <section className="flex flex-col gap-6 rounded-3xl border border-brand-ink/5 bg-white/95 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
          {content}
        </section>
      </main>
    </div>
  );
}

function getTrendWindow(searchParams: Record<string, string | string[] | undefined>): TrendWindow {
  const value = searchParams.window;
  if (!value) return 26;
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  if (TREND_WINDOWS.includes(parsed as TrendWindow)) {
    return parsed as TrendWindow;
  }
  return 26;
}

function renderActiveTab(
  activeTab: TabSlug,
  filters: {
    selectedLevel: string | null;
    selectedLevels: string[];
    selectedBand: string | null;
    trendWindow: TrendWindow;
  },
) {
  switch (activeTab) {
    case "overview":
      return (
        <Suspense
          fallback={
            <div className="flex flex-col gap-6">
              <CardsSkeleton />
              <ChartsSkeleton count={3} />
            </div>
          }
        >
          <OverviewPanel />
        </Suspense>
      );
    case "progress":
      return (
        <Suspense fallback={<FullPanelSkeleton chartCount={5} />}>
          <ProgressPanel
            selectedLevel={filters.selectedLevel ?? undefined}
            selectedLevels={filters.selectedLevels}
            initialTrendWindow={filters.trendWindow}
          />
        </Suspense>
      );
    case "engagement":
      return (
        <Suspense fallback={<FullPanelSkeleton chartCount={5} />}>
          <EngagementPanel />
        </Suspense>
      );
    case "risk":
      return (
        <Suspense fallback={<FullPanelSkeleton chartCount={2} />}>
          <RiskPanel
            selectedLevel={filters.selectedLevel ?? undefined}
            selectedBand={filters.selectedBand ?? undefined}
          />
        </Suspense>
      );
    case "finances":
      return (
        <Suspense fallback={<CardsSkeleton />}>
          <FinancesPanel />
        </Suspense>
      );
    case "ops":
      return (
        <Suspense fallback={<FullPanelSkeleton chartCount={4} />}>
          <OpsPanel />
        </Suspense>
      );
    case "exams":
      return (
        <Suspense fallback={<FullPanelSkeleton chartCount={2} />}>
          <ExamsPanel />
        </Suspense>
      );
    default:
      return <ErrorState retryHref="/panel-gerencial/overview" />;
  }
}
