export default function FinanceLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f3f9ff] via-white to-[#ebfdf5]">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-14">
        <header className="flex flex-col gap-4">
          <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
          <div className="h-10 w-64 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-96 animate-pulse rounded bg-slate-200" />
        </header>
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-32 animate-pulse rounded-2xl bg-slate-200/60" />
            <div className="h-32 animate-pulse rounded-2xl bg-slate-200/60" />
          </div>
          <div className="h-80 animate-pulse rounded-2xl bg-slate-200/60" />
          <div className="h-80 animate-pulse rounded-2xl bg-slate-200/60" />
        </div>
      </main>
    </div>
  );
}
