export default function RegistroLoading() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-20 top-16 h-60 w-60 -rotate-[14deg] rounded-[42px] bg-[#ffe3cd] opacity-80" />
        <div className="absolute right-4 top-24 h-52 w-52 rotate-[18deg] rounded-[36px] bg-[#ccf6f0] opacity-80" />
        <div className="absolute bottom-0 left-1/2 h-[460px] w-[120%] -translate-x-1/2 rounded-t-[180px] bg-gradient-to-r from-[#ffe7d1] via-[#ffffffef] to-[#c9f5ed]" />
      </div>
      <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-12 md:px-10 lg:px-14">
        <header className="flex flex-col gap-4 rounded-[32px] border border-white/70 bg-white/92 px-6 py-6 shadow-[0_20px_48px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="flex flex-col gap-3">
            <div className="h-4 w-40 animate-pulse rounded-full bg-brand-teal-soft/60" />
            <div className="h-8 w-64 animate-pulse rounded-full bg-brand-ink/10" />
            <div className="h-8 w-44 animate-pulse rounded-full bg-brand-ink/10" />
          </div>
        </header>
        <div className="grid gap-10 lg:grid-cols-[1.45fr_1fr]">
          <div className="flex flex-col gap-6 rounded-[36px] border border-white/70 bg-white/92 p-9 shadow-[0_24px_58px_rgba(15,23,42,0.12)] backdrop-blur">
            <div className="flex flex-col gap-4">
              <div className="h-5 w-48 animate-pulse rounded-full bg-brand-ink/10" />
              <div className="h-12 w-full animate-pulse rounded-full bg-brand-ink/10" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-[22px] bg-brand-ink/10" />
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-[22px] bg-brand-ink/10" />
              ))}
            </div>
            <div className="h-12 w-48 animate-pulse rounded-full bg-brand-ink/10" />
          </div>
          <aside className="flex flex-col gap-5 rounded-[36px] border border-white/70 bg-white/92 p-7 shadow-[0_22px_56px_rgba(15,23,42,0.12)] backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="h-5 w-40 animate-pulse rounded-full bg-brand-ink/10" />
              <div className="h-7 w-16 animate-pulse rounded-full bg-brand-teal-soft/70" />
            </div>
            <div className="h-16 animate-pulse rounded-[24px] bg-brand-ink/5" />
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-32 animate-pulse rounded-[22px] bg-brand-ink/10" />
              ))}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
