import type { DaysInLevelData } from "@/types/learning-panel";

type Props = {
  data: DaysInLevelData;
};

export function DaysInLevelCard({ data }: Props) {
  const { overall_median } = data;

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-sm">
      <header className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900">Días en nivel (mediana)</h3>
      </header>
      <div className="flex flex-col gap-1">
        <div className="text-3xl font-bold text-slate-900">
          {overall_median}
        </div>
        <p className="text-xs text-slate-500">Estudiantes actuales</p>
      </div>
      <figcaption className="sr-only">
        Días promedio en el nivel actual (mediana)
      </figcaption>
    </section>
  );
}
