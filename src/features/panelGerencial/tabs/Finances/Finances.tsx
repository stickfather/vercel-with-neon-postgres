export default function FinancesPanel() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-brand-deep">Finanzas</h2>
        <p className="text-sm text-brand-ink-muted">
          Seguimiento financiero de ingresos, gastos y márgenes clave.
        </p>
      </header>
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-brand-ink/10 bg-white/80 p-10 text-center text-sm text-brand-ink-muted">
        <span className="text-lg font-semibold text-brand-deep">Panel en construcción</span>
        <p>
          Estamos preparando los reportes financieros. Pronto podrás revisar métricas de presupuesto y flujo de caja desde este mismo lugar.
        </p>
      </div>
    </div>
  );
}
