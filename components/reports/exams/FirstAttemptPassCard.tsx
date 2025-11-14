type Props = {
  valuePct: number | null;
};

export function FirstAttemptPassCard({ valuePct }: Props) {
  const percentage = valuePct;

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-sm">
      <header className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Aprobación en Primer Intento (90d)
        </h3>
      </header>
      <div className="flex flex-col gap-1">
        <div className="text-3xl font-bold text-slate-900">
          {percentage !== null ? `${percentage.toFixed(1)}%` : "—"}
        </div>
        <p className="text-xs text-slate-500">
          Primer intento por estudiante × tipo × nivel
        </p>
      </div>
    </section>
  );
}
