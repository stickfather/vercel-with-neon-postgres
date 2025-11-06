import type { DebtorRow } from "@/types/reports.finance";
import { getRiskColorClasses } from "./financeUtils";

const currencyFormatter = new Intl.NumberFormat("es-EC", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat("es-EC");

type Props = {
  debtors: DebtorRow[];
  variant?: "light" | "dark";
};

export function TopDebtorsCard({ debtors, variant = "light" }: Props) {
  const isDark = variant === "dark";
  const cardClasses = isDark
    ? "rounded-2xl border border-slate-800/60 bg-slate-900/70 p-6 shadow-sm"
    : "rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm";
  const titleClasses = isDark ? "text-slate-100" : "text-slate-900";
  const secondaryText = isDark ? "text-slate-400" : "text-slate-500";
  const hintText = "text-slate-400";

  const topDebtors = debtors.slice(0, 10);

  if (topDebtors.length === 0) {
    const emptyClasses = isDark
      ? "flex h-64 items-center justify-center text-slate-400"
      : "flex h-64 items-center justify-center text-slate-500";
    return (
      <section className={cardClasses}>
        <header className="mb-4 flex items-center justify-between">
          <h3 className={`text-lg font-semibold ${titleClasses}`}>Principales deudores</h3>
          <span title="Los 10 alumnos con mayores saldos vencidos." className={`text-xs ${hintText}`}>
            ℹ
          </span>
        </header>
        <div className={emptyClasses}>Sin deudores registrados</div>
      </section>
    );
  }

  return (
    <section className={cardClasses}>
      <header className="mb-4 flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${titleClasses}`}>Principales deudores</h3>
        <span title="Los 10 alumnos con mayores saldos vencidos." className={`text-xs ${hintText}`}>
          ℹ
        </span>
      </header>

      <div className="space-y-3">
        {topDebtors.map((debtor) => {
          const daysOverdue = debtor.max_days_overdue;
          const chipClasses = getRiskColorClasses(daysOverdue, isDark);

          return (
            <div
              key={debtor.student_id}
              className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                isDark
                  ? "border-slate-700/60 bg-slate-800/50 hover:bg-slate-800/80"
                  : "border-slate-200/70 bg-slate-50 hover:bg-slate-100"
              }`}
            >
              <div className="flex-1">
                <div className={`font-medium ${titleClasses}`}>
                  {debtor.full_name || `ID ${debtor.student_id}`}
                </div>
                <div className={`text-sm ${secondaryText}`}>
                  {currencyFormatter.format(debtor.total_overdue_amount)}
                </div>
              </div>
              <div className={`rounded-md border px-2 py-1 text-xs font-medium ${chipClasses}`}>
                {integerFormatter.format(daysOverdue)} d · {integerFormatter.format(debtor.open_invoices)} facturas
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
