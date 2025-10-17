import ResumenGeneralPanel from "@/components/reports/resumen/ResumenGeneralPanel";

export const revalidate = 300;

export default function OverviewPanel() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-brand-deep">Resumen general</h2>
        <p className="text-sm text-brand-ink-muted">
          Indicadores clave de salud institucional, actividad reciente y progreso académico.
        </p>
      </header>
      <ResumenGeneralPanel />
    </div>
  );
}
