import type { PersonnelStaffingMix } from "@/types/personnel";

type BandTilesProps = {
  data: PersonnelStaffingMix[];
};

// Map Spanish block names to English
const blockNameMap: Record<string, string> = {
  "Bloque 1 (08–10)": "Block 1 (08–10)",
  "Bloque 2 (10–13)": "Block 2 (10–13)",
  "Bloque 3 (14–18)": "Block 3 (14–18)",
  "Bloque 4 (18–20)": "Block 4 (18–20)",
};

function getStatusNote(ratio: number): {
  text: string;
  colorClass: string;
} {
  if (ratio <= 2.0) {
    return {
      text: "Bien cubierto",
      colorClass: "bg-emerald-100 text-emerald-700",
    };
  }
  if (ratio <= 3.0) {
    return {
      text: "Cobertura ajustada",
      colorClass: "bg-amber-100 text-amber-700",
    };
  }
  return {
    text: "Requiere refuerzo",
    colorClass: "bg-rose-100 text-rose-700",
  };
}

export function BandTiles({ data }: BandTilesProps) {
  // Ensure we have exactly 4 blocks in the correct order
  const orderedBlocks = [
    "Bloque 1 (08–10)",
    "Bloque 2 (10–13)",
    "Bloque 3 (14–18)",
    "Bloque 4 (18–20)",
  ];

  const blockData = orderedBlocks.map((blockName) => {
    const found = data.find((d) => d.bloque === blockName);
    return (
      found || {
        bloque: blockName,
        minutos_estudiantes: 0,
        minutos_personal: 0,
        ratio_estudiantes_personal: 0,
      }
    );
  });

  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <figcaption className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-slate-900 md:text-lg">
          Cobertura por Bloques de Tiempo
        </h2>
        <p className="text-sm text-slate-600">
          Resumen de bloques operativos con ratios de personal
        </p>
      </figcaption>

      <div className="grid gap-4 sm:grid-cols-2">
        {blockData.map((block) => {
          const status = getStatusNote(block.ratio_estudiantes_personal);
          const blockLabel = blockNameMap[block.bloque] || block.bloque;

          return (
            <div
              key={block.bloque}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:shadow-md"
              title={`${blockLabel} — Estudiantes: ${block.minutos_estudiantes.toLocaleString("es-EC")} min • Personal: ${block.minutos_personal.toLocaleString("es-EC")} min • Ratio: ${block.ratio_estudiantes_personal.toFixed(2)}×`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  {blockLabel}
                </h3>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${status.colorClass}`}
                >
                  {block.ratio_estudiantes_personal.toFixed(2)}×
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex flex-col gap-1">
                  <span className="text-slate-500">Minutos estudiantes</span>
                  <span className="font-semibold text-slate-900">
                    {block.minutos_estudiantes.toLocaleString("es-EC")}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-slate-500">Minutos personal</span>
                  <span className="font-semibold text-slate-900">
                    {block.minutos_personal.toLocaleString("es-EC")}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600">{status.text}</p>
            </div>
          );
        })}
      </div>
    </figure>
  );
}
