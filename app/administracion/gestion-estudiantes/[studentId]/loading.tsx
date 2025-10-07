import { BasicDetailsPanelSkeleton } from "@/features/administration/components/student-profile/basic-details-panel";

export default function Loading() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-20 h-64 w-64 -rotate-[16deg] rounded-[42px] bg-[#ffe6d2] opacity-80" />
        <div className="absolute right-0 top-10 h-56 w-56 rotate-[12deg] rounded-[38px] bg-[#dff8f2] opacity-80" />
        <div className="absolute bottom-0 left-1/2 h-[480px] w-[120%] -translate-x-1/2 rounded-t-[180px] bg-gradient-to-r from-[#ffeede] via-white to-[#c9f5ed]" />
      </div>

      <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-12 md:px-10 lg:px-14">
        <header className="flex animate-pulse flex-col gap-6 rounded-[32px] border border-white/70 bg-white/92 px-7 py-8 text-left shadow-[0_24px_58px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-brand-ink-muted">
            <div className="flex flex-col gap-1">
              <span className="h-4 w-40 rounded-full bg-brand-deep-soft/50" />
              <span className="h-4 w-48 rounded-full bg-brand-deep-soft/40" />
            </div>
            <span className="h-8 w-56 rounded-full bg-white/70" />
          </div>
          <span className="h-8 w-40 rounded-full bg-brand-deep-soft" />
          <div className="flex flex-col gap-6 text-brand-deep lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <span className="h-24 w-24 rounded-full bg-brand-deep-soft/80" />
              <div className="flex flex-col gap-3">
                <span className="h-10 w-64 rounded-full bg-brand-deep-soft/80" />
                <span className="h-9 w-40 rounded-full bg-white/70" />
                <div className="flex flex-wrap gap-3">
                  <span className="h-4 w-32 rounded-full bg-brand-deep-soft/40" />
                  <span className="h-4 w-24 rounded-full bg-brand-deep-soft/30" />
                </div>
                <span className="h-4 w-72 max-w-full rounded-full bg-brand-deep-soft/40" />
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-6 pb-10">
          <div className="-mx-2 overflow-x-hidden pb-2">
            <div className="mx-2 flex min-w-full items-center gap-2 border-b border-brand-ink-muted/10">
              <span className="h-10 w-32 rounded-t-2xl bg-brand-teal-soft/60" />
              <span className="h-10 w-32 rounded-t-2xl bg-white/70" />
              <span className="h-10 w-40 rounded-t-2xl bg-white/70" />
              <span className="h-10 w-32 rounded-t-2xl bg-white/70" />
              <span className="h-10 w-32 rounded-t-2xl bg-white/70" />
              <span className="h-10 w-24 rounded-t-2xl bg-white/70" />
            </div>
          </div>
          <BasicDetailsPanelSkeleton />
        </div>
      </main>
    </div>
  );
}
