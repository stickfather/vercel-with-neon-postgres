"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f3f9ff] via-white to-[#ebfdf5]">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-14">
        <header className="flex flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">
            Management Reports
          </span>
          <h1 className="text-3xl font-black text-slate-900 sm:text-[40px]">
            Teacher Coverage & Load
          </h1>
        </header>
        
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
            <h3 className="mb-2 text-lg font-semibold text-rose-900">
              We couldn't load the data
            </h3>
            <p className="mb-4 text-sm text-rose-800">
              {error.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={reset}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              Try again
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
      </main>
    </div>
  );
}
