function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type SkeletonBlockProps = {
  className?: string;
};

export function SkeletonBlock({ className }: SkeletonBlockProps) {
  return (
    <div
      className={cx(
        "h-20 rounded-3xl border border-white/60 bg-white/80 shadow-inner",
        "animate-pulse",
        className,
      )}
    />
  );
}

export function CardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <SkeletonBlock key={index} className="h-28" />
      ))}
    </div>
  );
}

export function ChartsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonBlock key={index} className="h-80" />
      ))}
    </div>
  );
}

export function FullPanelSkeleton({ chartCount }: { chartCount: number }) {
  return (
    <div className="flex flex-col gap-6">
      <CardsSkeleton />
      <ChartsSkeleton count={chartCount} />
    </div>
  );
}
