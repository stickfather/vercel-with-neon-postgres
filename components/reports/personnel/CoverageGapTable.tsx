import type { UnderOverRow } from "@/types/personnel";

const minutesFormatter = new Intl.NumberFormat("es-EC");
const ratioFormatter = new Intl.NumberFormat("es-EC", { maximumFractionDigits: 1 });

type Props = {
  title: string;
  rows: UnderOverRow[];
  variant: "under" | "over";
};

export function CoverageGapTable({ title, rows, variant }: Props) {
  const isUnder = variant === "under";
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <header className="mb-4">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">
          {isUnder
            ? "Estudiantes por profesor por encima del objetivo (10×)"
            : "Horas con personal excedente respecto a demanda"}
        </p>
      </header>
      {!rows.length ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
          {isUnder ? "Sin horas críticas registradas." : "No detectamos sobrecobertura significativa."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Hora</th>
                <th className="px-4 py-3 text-right">Min. estudiantes</th>
                <th className="px-4 py-3 text-right">Min. personal</th>
                <th className="px-4 py-3 text-right">Ratio</th>
                <th className="px-4 py-3 text-right">Gap vs meta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((row) => (
                <tr key={row.hourLabel}>
                  <td className="px-4 py-3 font-medium text-slate-900">{row.hourLabel}</td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {minutesFormatter.format(row.studentMinutes)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {minutesFormatter.format(row.staffMinutes)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {row.ratio !== null ? `${ratioFormatter.format(row.ratio)}×` : "—"}
                  </td>
                  <td className={`px-4 py-3 text-right text-sm font-semibold ${isUnder ? "text-rose-600" : "text-emerald-600"}`}>
                    {ratioFormatter.format(row.gapMetric)}×
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
