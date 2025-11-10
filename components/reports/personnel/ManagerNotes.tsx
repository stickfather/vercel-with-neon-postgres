type ManagerNotesProps = {
  summary: string;
  bullets: string[];
};

export function ManagerNotes({ summary, bullets }: ManagerNotesProps) {
  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <figcaption className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-slate-900 md:text-lg">
          Notas de Gestión IA
        </h2>
        <p className="text-sm text-slate-600">
          Resumen ejecutivo y acciones recomendadas
        </p>
      </figcaption>

      <div className="flex flex-col gap-4">
        {/* Summary paragraph */}
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm leading-relaxed text-slate-700">{summary}</p>
        </div>

        {/* Action bullets */}
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Acciones Recomendadas
          </h3>
          <ul className="space-y-2">
            {bullets.map((bullet, index) => (
              <li
                key={index}
                className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                  {index + 1}
                </span>
                <span className="flex-1">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </figure>
  );
}
