function SkeletonTile() {
  return <div className="h-28 rounded-2xl bg-slate-200/60" />;
}

function SkeletonBlock({ tall = false }: { tall?: boolean }) {
  return <div className={`rounded-2xl bg-slate-200/60 ${tall ? "h-96" : "h-64"}`} />;
}

export default function LoadingLearningReport() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f2f9ff] via-white to-[#f0fdf4]">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <div className="h-3 w-48 rounded-full bg-slate-200/80" />
            <div className="h-8 w-72 rounded-full bg-slate-200/80" />
            <div className="h-4 w-80 rounded-full bg-slate-200/80" />
          </div>
          <div className="h-4 w-40 rounded-full bg-slate-200/80" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonTile key={index} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
        <SkeletonBlock tall />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
      </main>
    </div>
  );
}
