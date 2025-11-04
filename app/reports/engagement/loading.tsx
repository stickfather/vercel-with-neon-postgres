export default function EngagementLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f2f9ff] via-white to-[#f0fdf4]">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-14">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Informes de gestión</span>
            <h1 className="text-3xl font-black text-slate-900 sm:text-[40px]">Panel de engagement</h1>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-200/50"></div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="h-96 animate-pulse rounded-2xl bg-slate-200/50"></div>
          <div className="h-96 animate-pulse rounded-2xl bg-slate-200/50"></div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-2xl bg-slate-200/50"></div>
          <div className="h-64 animate-pulse rounded-2xl bg-slate-200/50"></div>
        </div>

        <div className="h-64 animate-pulse rounded-2xl bg-slate-200/50"></div>
      </main>
    </div>
  );
}
