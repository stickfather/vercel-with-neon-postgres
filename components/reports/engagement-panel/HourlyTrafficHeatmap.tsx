import type { HourHeatmapByDay } from "@/types/reports.engagement";

const WEEKDAYS: { index: number; label: string }[] = [
  { index: 1, label: "Lun" },
  { index: 2, label: "Mar" },
  { index: 3, label: "Mié" },
  { index: 4, label: "Jue" },
  { index: 5, label: "Vie" },
  { index: 6, label: "Sáb" },
  { index: 7, label: "Dom" },
];

const HOURS = Array.from({ length: 13 }, (_, idx) => idx + 8);

const numberFormatter = new Intl.NumberFormat("es-EC");

function getCellValue(map: HourHeatmapByDay, weekdayIndex: number, hour24: number): number {
  const dayCells = map?.[weekdayIndex];
  if (!dayCells?.length) return 0;
  const match = dayCells.find((cell) => cell.hour24 === hour24);
  return match?.totalMinutes90d ?? 0;
}

function resolveCellColor(value: number, maxValue: number): string {
  if (maxValue <= 0 || value <= 0) {
    return "bg-slate-100 text-slate-500";
  }

  const ratio = value / maxValue;
  if (ratio >= 0.85) return "bg-sky-700 text-white";
  if (ratio >= 0.65) return "bg-sky-600 text-white";
  if (ratio >= 0.45) return "bg-sky-500 text-white";
  if (ratio >= 0.25) return "bg-sky-300 text-slate-900";
  return "bg-sky-100 text-slate-900";
}

function formatHourLabel(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}

export function HourlyTrafficHeatmap({ data }: { data: HourHeatmapByDay }) {
  const values = WEEKDAYS.flatMap((day) => HOURS.map((hour) => getCellValue(data, day.index, hour)));
  const maxValue = values.length ? Math.max(...values) : 0;
  const hasData = maxValue > 0;

  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Uso por horario</p>
      <h3 className="mt-2 text-2xl font-semibold text-slate-900">Tráfico por Hora — Heatmap (últimos 90 días)</h3>
      <p className="mt-1 text-sm text-slate-500">Demanda por día de semana y hora (08h00 - 20h00).</p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="w-16 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Día</th>
              {HOURS.map((hour) => (
                <th key={hour} className="px-2 py-1 text-center text-[11px] font-semibold text-slate-500">
                  {formatHourLabel(hour)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKDAYS.map((day) => (
              <tr key={day.index}>
                <th className="pr-2 text-left text-sm font-semibold text-slate-700">{day.label}</th>
                {HOURS.map((hour) => {
                  const value = getCellValue(data, day.index, hour);
                  const color = resolveCellColor(value, maxValue);
                  return (
                    <td key={hour} className="text-center">
                      <div
                        className={`rounded-md px-2 py-2 text-[11px] font-semibold transition-colors ${color}`}
                        title={`${day.label} ${formatHourLabel(hour)} · ${value.toLocaleString("es-EC")} minutos (90d)`}
                      >
                        {value > 0 ? numberFormatter.format(value) : hasData ? "—" : ""}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!hasData ? (
        <p className="mt-4 text-xs text-slate-500">
          Datos no disponibles temporalmente. Mostramos el mapa vacío hasta recibir información de las vistas finales.
        </p>
      ) : null}

      <div className="mt-5 flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Minutos (90d)</span>
        <div className="flex items-center gap-1">
          {["bg-slate-100", "bg-sky-100", "bg-sky-300", "bg-sky-500", "bg-sky-700"].map((color) => (
            <span key={color} className={`h-3 w-8 rounded ${color}`} />
          ))}
        </div>
        <span className="text-xs text-slate-500">Menor</span>
        <span className="text-xs text-slate-500">Mayor</span>
      </div>
    </article>
  );
}
