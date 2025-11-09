"use client";

import { formatCurrency, formatChartDate, formatFullDate } from "@/lib/datetime/format";
import type {
  FinancialCollections30d,
  FinancialCollections30dSeries,
} from "@/types/finance";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Props = {
  summary: FinancialCollections30d | null;
  series: FinancialCollections30dSeries[];
};

export function Collections30dCard({ summary, series }: Props) {
  const totalCollected = summary?.total_collected_30d ?? 0;
  const paymentsCount = summary?.payments_count_30d ?? 0;

  const chartData = series.map((point) => ({
    date: point.d,
    amount: point.amount_day,
    payments: point.payments_day,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      {/* KPI Card */}
      <div className="flex flex-col gap-2 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Collected (30d)
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black text-slate-900">
            {formatCurrency(totalCollected)}
          </span>
        </div>
        <span className="text-sm text-slate-600">
          Payments: {paymentsCount.toLocaleString("en-US")}
        </span>
      </div>

      {/* Daily Trend Chart */}
      <figure className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
        <figcaption className="mb-4 text-base font-semibold text-slate-900">
          Daily Collections (30d)
        </figcaption>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => formatChartDate(value)}
                tick={{ fontSize: 12, fill: "#64748b" }}
                tickLine={{ stroke: "#e2e8f0" }}
              />
              <YAxis
                tickFormatter={(value) => formatCurrency(value).replace(/\.\d+/, "")}
                tick={{ fontSize: 12, fill: "#64748b" }}
                tickLine={{ stroke: "#e2e8f0" }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg bg-slate-900 px-3 py-2 text-white shadow-lg">
                      <p className="text-sm font-medium">
                        {formatFullDate(data.date)}
                      </p>
                      <p className="text-sm">
                        {formatCurrency(data.amount)} ({data.payments} payments)
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#colorAmount)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </figure>
    </div>
  );
}
