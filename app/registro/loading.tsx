export default function RegistroLoading() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-20 top-16 h-60 w-60 -rotate-[14deg] rounded-[42px] bg-[#ffe3cd] opacity-80" />
        <div className="absolute right-4 top-24 h-52 w-52 rotate-[18deg] rounded-[36px] bg-[#ccf6f0] opacity-80" />
        <div className="absolute bottom-0 left-1/2 h-[460px] w-[120%] -translate-x-1/2 rounded-t-[180px] bg-gradient-to-r from-[#ffe7d1] via-[#ffffffef] to-[#c9f5ed]" />
      </div>
      <main className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-10 md:px-10 lg:px-14">
        <header className="flex flex-col gap-3 text-center sm:text-left">
          <span className="inline-flex w-fit items-center justify-center rounded-full bg-white/80 px-4 py-1 shadow">
            <span className="h-3 w-32 animate-pulse rounded-full bg-brand-teal/40" />
          </span>
          <div className="mx-auto h-8 w-64 animate-pulse rounded-full bg-brand-ink/10 sm:mx-0 sm:w-80" />
          <div className="mx-auto h-4 w-72 animate-pulse rounded-full bg-brand-ink/10 sm:mx-0 sm:w-[380px]" />
        </header>

        <div className="grid gap-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.05fr)] xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)]">
          <div className="flex flex-col gap-8 rounded-[36px] border border-white/70 bg-white/95 px-10 py-12 shadow-[0_24px_58px_rgba(15,23,42,0.12)] backdrop-blur">
            <div className="flex flex-col gap-3 text-left">
              <div className="h-3 w-36 animate-pulse rounded-full bg-brand-ink/10" />
              <div className="h-8 w-64 animate-pulse rounded-full bg-brand-ink/10" />
            </div>
            <div className="flex flex-col gap-3">
              <div className="h-12 w-full animate-pulse rounded-full bg-brand-ink/10" />
              <div className="flex flex-col gap-2 rounded-[28px] border border-dashed border-brand-teal/60 bg-white/70 px-4 py-4">
                <div className="h-3 w-48 animate-pulse rounded-full bg-brand-ink/10" />
                <div className="h-3 w-40 animate-pulse rounded-full bg-brand-ink/10" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="h-4 w-20 animate-pulse rounded-full bg-brand-ink/10" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    // eslint-disable-next-line react/no-array-index-key
                    key={`level-${index}`}
                    className="h-[68px] animate-pulse rounded-full bg-brand-ink/10"
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="h-4 w-24 animate-pulse rounded-full bg-brand-ink/10" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    // eslint-disable-next-line react/no-array-index-key
                    key={`lesson-${index}`}
                    className="h-20 animate-pulse rounded-[24px] bg-brand-ink/10"
                  />
                ))}
              </div>
            </div>
            <div className="mt-2 h-12 w-56 animate-pulse rounded-full bg-brand-orange/40" />
          </div>

          <aside className="flex flex-col gap-5 rounded-[36px] border border-white/70 bg-white/94 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.14)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-2 text-left">
                <div className="h-4 w-44 animate-pulse rounded-full bg-brand-ink/10" />
                <div className="h-3 w-36 animate-pulse rounded-full bg-brand-ink/10" />
              </div>
              <div className="h-8 w-16 animate-pulse rounded-full bg-brand-teal-soft" />
            </div>
            <div className="h-16 animate-pulse rounded-[28px] bg-brand-ink/5" />
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  // eslint-disable-next-line react/no-array-index-key
                  key={`bubble-${index}`}
                  className="h-24 animate-pulse rounded-[20px] bg-brand-ink/10"
                />
              ))}
            </div>
          </aside>
        </div>

        <div className="flex flex-col gap-3 rounded-[28px] border border-white/70 bg-white/92 px-5 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.12)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="h-4 w-64 animate-pulse rounded-full bg-brand-ink/10" />
          <div className="flex flex-wrap justify-end gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={`quick-link-${index}`}
                className="h-10 w-36 animate-pulse rounded-full bg-brand-ink/10"
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
