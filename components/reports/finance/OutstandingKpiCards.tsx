"use client";

import { formatCurrency } from "@/lib/datetime/format";
import type {
  FinancialOutstandingStudents,
  FinancialOutstandingBalance,
} from "@/types/finance";

type Props = {
  studentsData: FinancialOutstandingStudents | null;
  balanceData: FinancialOutstandingBalance | null;
};

export function OutstandingKpiCards({ studentsData, balanceData }: Props) {
  const studentsCount = studentsData?.outstanding_students ?? 0;
  const balance = balanceData?.outstanding_balance ?? 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Students with Debt */}
      <div className="flex flex-col gap-2 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Estudiantes con Deuda
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black text-slate-900">
            {studentsCount.toLocaleString("es-EC")}
          </span>
        </div>
        <span className="text-xs text-slate-500">al día de hoy</span>
      </div>

      {/* Outstanding Balance */}
      <div className="flex flex-col gap-2 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Saldo Pendiente
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black text-slate-900">
            {formatCurrency(balance)}
          </span>
        </div>
        <span className="text-xs text-slate-500">al día de hoy</span>
      </div>
    </div>
  );
}
