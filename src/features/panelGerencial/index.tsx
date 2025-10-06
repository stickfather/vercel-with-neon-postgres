import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import FilterRail from "./FilterRail";
import Tabs, { TabSlug, isValidTabSlug } from "./Tabs";
import { CardsSkeleton, ChartsSkeleton, FullPanelSkeleton } from "./Skeleton";
import ErrorState from "./ErrorState";
import OverviewPanel from "./tabs/Overview/Overview";
import ProgressPanel from "./tabs/Progress/Progress";
import EngagementPanel from "./tabs/Engagement/Engagement";
import RiskPanel from "./tabs/Risk/Risk";
import OpsPanel from "./tabs/Ops/Ops";
import ExamsPanel from "./tabs/Exams/Exams";

export const revalidate = 60;

function getSelectedLevel(searchParams: Record<string, string | string[] | undefined>) {
  const value = searchParams.level;
  if (Array.isArray(value)) return value[0];
  return value ?? null;
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
  const selectedBand = getSelectedBand(resolvedSearchParams);

  const content = renderActiveTab(activeTab, {
    selectedLevel,
    selectedBand,
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

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
          <FilterRail />
          <section className="flex flex-col gap-6 rounded-3xl border border-brand-ink/5 bg-white/95 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
            {content}
          </section>
        </div>
      </main>
    </div>
  );
}

function renderActiveTab(
  activeTab: TabSlug,
  filters: { selectedLevel: string | null; selectedBand: string | null },
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
          <ProgressPanel selectedLevel={filters.selectedLevel ?? undefined} />
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
