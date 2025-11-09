"use client";

import { formatCurrency } from "@/lib/datetime/format";
import type { FinancialAgingBuckets } from "@/types/finance";

type Props = {
  data: FinancialAgingBuckets | null;
};

export function AgingBucketsCard({ data }: Props) {
  if (!data) {
    return null;
  }

  const buckets = [
    {
      label: "0–30",
      amount: data.amt_0_30,
      count: data.cnt_0_30,
      color: "bg-slate-400",
    },
    {
      label: "31–60",
      amount: data.amt_31_60,
      count: data.cnt_31_60,
      color: "bg-amber-500",
    },
    {
      label: "61–90",
      amount: data.amt_61_90,
      count: data.cnt_61_90,
      color: "bg-orange-600",
    },
    {
      label: ">90",
      amount: data.amt_over_90,
      count: data.cnt_over_90,
      color: "bg-rose-600",
    },
  ];

  const totalAmount =
    data.amt_0_30 + data.amt_31_60 + data.amt_61_90 + data.amt_over_90;

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
