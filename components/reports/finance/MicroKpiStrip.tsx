"use client";

import { formatCurrency } from "@/lib/datetime/format";
import type {
  FinancialAgingBuckets,
  FinancialOutstandingStudents,
  FinancialOutstandingBalance,
  FinancialCollections30d,
} from "@/types/finance";

type Props = {
  agingBuckets: FinancialAgingBuckets | null;
  outstandingStudents: FinancialOutstandingStudents | null;
  outstandingBalance: FinancialOutstandingBalance | null;
  collections30d: FinancialCollections30d | null;
};

export function MicroKpiStrip({
  agingBuckets,
  outstandingStudents,
  outstandingBalance,
  collections30d,
}: Props) {
  // Calculate derived metrics
  const casesOver90 = agingBuckets?.cnt_over_90 ?? 0;

  const students = outstandingStudents?.outstanding_students ?? 0;
  const balance = outstandingBalance?.outstanding_balance ?? 0;
  const avgDebtPerStudent = students > 0 ? balance / students : 0;

  const collected30d = collections30d?.total_collected_30d ?? 0;
  const recoveryRate = balance > 0 ? (collected30d / balance) * 100 : 0;

  // Color coding for recovery rate
  const getRecoveryColor = (rate: number) => {
    if (rate >= 20) return "bg-green-100 text-green-700 border-green-200";
    if (rate >= 10) return "bg-blue-100 text-blue-700 border-blue-200";
    return "bg-rose-100 text-rose-700 border-rose-200";
  };

  return (
    <div className="flex flex-wrap gap-3">
      {/* Cases >90 days */}
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2">
        <span className="text-sm font-medium text-slate-600">
          Cases &gt;90 days:
        </span>
        <span className="text-lg font-bold text-slate-900">
          {casesOver90}
        </span>
      </div>

      {/* Average Debt per Student */}
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2">
        <span className="text-sm font-medium text-slate-600">
          Avg Debt/Student:
        </span>
        <span className="text-lg font-bold text-slate-900">
          {formatCurrency(avgDebtPerStudent)}
        </span>
      </div>

      {/* Recovery Rate */}
      <div
        className={`flex items-center gap-2 rounded-lg border px-4 py-2 ${getRecoveryColor(recoveryRate)}`}
      >
        <span className="text-sm font-medium">% Recovered (30d):</span>
        <span className="text-lg font-bold">
          {recoveryRate.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
