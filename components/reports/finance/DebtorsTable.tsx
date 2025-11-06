"use client";

import type { DebtorRow } from "@/types/reports.finance";
import { getRiskTextColor } from "./financeUtils";

const currencyFormatter = new Intl.NumberFormat("es-EC", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat("es-EC");

type Props = {
  debtors: DebtorRow[];
  selectedAgingSegment?: string | null;
  variant?: "light" | "dark";
};

export function DebtorsTable({ debtors, selectedAgingSegment, variant = "light" }: Props) {
  const isDark = variant === "dark";
  const cardClasses = isDark
    ? "rounded-2xl border border-slate-800/60 bg-slate-900/70 p-6 shadow-sm"
    : "rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm";
  const titleClasses = isDark ? "text-slate-100" : "text-slate-900";
  const secondaryText = isDark ? "text-slate-400" : "text-slate-500";
  const hintText = "text-slate-400";
  const tableHeaderBg = isDark ? "bg-slate-800/60" : "bg-slate-50";
  const rowBorder = isDark ? "border-slate-700/60" : "border-slate-200/70";

  // Filter debtors based on selected aging segment
  const filteredDebtors = selectedAgingSegment
    ? debtors.filter((debtor) => {
        const days = debtor.max_days_overdue;
        switch (selectedAgingSegment) {
          case "0-30":
            return days >= 0 && days <= 30;
          case "31-60":
            return days >= 31 && days <= 60;
          case "61-90":
            return days >= 61 && days <= 90;
          case "90+":
            return days > 90;
          default:
            return true;
        }
      })
    : debtors;

  if (filteredDebtors.length === 0) {
    const emptyClasses = isDark
      ? "flex h-32 items-center justify-center text-slate-400"
      : "flex h-32 items-center justify-center text-slate-500";
    return (
      <section className={cardClasses}>
        <header className="mb-4 flex items-center justify-between">
          <h3 className={`text-lg font-semibold ${titleClasses}`}>
            Tabla completa de deudores
            {selectedAgingSegment && (
              <span className={`ml-2 text-sm font-normal ${secondaryText}`}>
                (Filtrado: {selectedAgingSegment})
              </span>
            )}
          </h3>
          <span title="Listado completo de alumnos con saldos vencidos." className={`text-xs ${hintText}`}>
            ℹ
          </span>
        </header>
        <div className={emptyClasses}>Sin deudores</div>
      </section>
    );
  }

  return (
    <section className={cardClasses}>
      <header className="mb-4 flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${titleClasses}`}>
          Tabla completa de deudores
          {selectedAgingSegment && (
            <span className={`ml-2 text-sm font-normal ${secondaryText}`}>
              (Filtrado: {selectedAgingSegment})
            </span>
          )}
        </h3>
        <span title="Listado completo de alumnos con saldos vencidos." className={`text-xs ${hintText}`}>
          ℹ
        </span>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={`${tableHeaderBg} text-left`}>
              <th className={`px-4 py-3 font-semibold ${secondaryText}`}>Alumno</th>
              <th className={`px-4 py-3 text-right font-semibold ${secondaryText}`}>Monto total</th>
              <th className={`px-4 py-3 text-center font-semibold ${secondaryText}`}>Días máx</th>
              <th className={`px-4 py-3 text-center font-semibold ${secondaryText}`}>Facturas</th>
              <th className={`px-4 py-3 font-semibold ${secondaryText}`}>Más antigua</th>
            </tr>
          </thead>
          <tbody>
            {filteredDebtors.map((debtor) => {
              const daysOverdue = debtor.max_days_overdue;
              const textColor = getRiskTextColor(daysOverdue, isDark);

              return (
                <tr
                  key={debtor.student_id}
                  className={`border-t transition-colors hover:bg-opacity-50 ${rowBorder} ${
                    isDark ? "hover:bg-slate-800/50" : "hover:bg-slate-50"
                  }`}
                >
                  <td className={`px-4 py-3 ${titleClasses}`}>
                    {debtor.full_name || `ID ${debtor.student_id}`}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${titleClasses}`}>
                    {currencyFormatter.format(debtor.total_overdue_amount)}
                  </td>
                  <td className={`px-4 py-3 text-center font-medium ${textColor}`}>
                    {integerFormatter.format(daysOverdue)}
                  </td>
                  <td className={`px-4 py-3 text-center ${secondaryText}`}>
                    {integerFormatter.format(debtor.open_invoices)}
                  </td>
                  <td className={`px-4 py-3 text-xs ${secondaryText}`}>
                    {debtor.oldest_due_date
                      ? new Date(debtor.oldest_due_date).toLocaleDateString("es-EC", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={`mt-4 text-xs ${secondaryText} text-center`}>
        Mostrando {integerFormatter.format(filteredDebtors.length)} de{" "}
        {integerFormatter.format(debtors.length)} deudores
      </div>
    </section>
  );
}
