"use client";

import { formatCurrency } from "@/lib/datetime/format";
import type { FinancialOutstandingStudent } from "@/types/finance";

type Props = {
  data: FinancialOutstandingStudent[];
};

export function AgingBucketsCard({ data }: Props) {
  if (!data || data.length === 0) {
    return null;
  }

  // Aggregate overdue amounts from all students
  const totals = data.reduce(
    (acc, student) => ({
      amt_0_30: acc.amt_0_30 + student.overdue_0_30,
      amt_31_60: acc.amt_31_60 + student.overdue_31_60,
      amt_61_90: acc.amt_61_90 + student.overdue_61_90,
      amt_over_90: acc.amt_over_90 + student.overdue_90_plus,
      cnt_0_30: acc.cnt_0_30 + (student.overdue_0_30 > 0 ? 1 : 0),
      cnt_31_60: acc.cnt_31_60 + (student.overdue_31_60 > 0 ? 1 : 0),
      cnt_61_90: acc.cnt_61_90 + (student.overdue_61_90 > 0 ? 1 : 0),
      cnt_over_90: acc.cnt_over_90 + (student.overdue_90_plus > 0 ? 1 : 0),
    }),
    {
      amt_0_30: 0,
      amt_31_60: 0,
      amt_61_90: 0,
      amt_over_90: 0,
      cnt_0_30: 0,
      cnt_31_60: 0,
      cnt_61_90: 0,
      cnt_over_90: 0,
    }
  );

  const buckets = [
    {
      label: "0–30",
      amount: totals.amt_0_30,
      count: totals.cnt_0_30,
      color: "bg-slate-400",
    },
    {
      label: "31–60",
      amount: totals.amt_31_60,
      count: totals.cnt_31_60,
      color: "bg-amber-500",
    },
    {
      label: "61–90",
      amount: totals.amt_61_90,
      count: totals.cnt_61_90,
      color: "bg-orange-600",
    },
    {
      label: ">90",
      amount: totals.amt_over_90,
      count: totals.cnt_over_90,
      color: "bg-rose-600",
    },
  ];

  const totalAmount =
    totals.amt_0_30 + totals.amt_31_60 + totals.amt_61_90 + totals.amt_over_90;

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
      <h2 className="text-base font-semibold text-slate-900">
        Antigüedad de Deuda
      </h2>

      {/* Amounts by Aging Bucket */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-slate-600">
          Montos por Días Vencidos
        </h3>
        <div className="flex flex-col gap-2">
          {buckets.map((bucket) => {
            const percent =
              totalAmount > 0 ? (bucket.amount / totalAmount) * 100 : 0;
            return (
              <div key={bucket.label} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">
                    {bucket.label} days
                  </span>
                  <span className="text-slate-600">
                    {formatCurrency(bucket.amount)} ({Math.round(percent)}%)
                  </span>
                </div>
                <div className="relative h-8 w-full overflow-hidden rounded-lg bg-slate-100">
                  <div
                    className={`h-full ${bucket.color} transition-all duration-300`}
                    style={{ width: `${percent}%` }}
                    title={`${bucket.label} — ${formatCurrency(bucket.amount)} (${bucket.count} cases)`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Number of Cases by Aging Bucket */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-slate-600">
          Number of Cases
        </h3>
        <div className="flex flex-wrap gap-2">
          {buckets.map((bucket) => (
            <div
              key={bucket.label}
              className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2"
              title={`${bucket.label} days: ${bucket.count} cases`}
            >
              <div className={`h-3 w-3 rounded-full ${bucket.color}`} />
              <span className="text-sm font-medium text-slate-700">
                {bucket.label}
              </span>
              <span className="text-sm font-semibold text-slate-900">
                {bucket.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
