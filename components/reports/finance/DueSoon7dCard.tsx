"use client";

import { formatCurrency, formatChartDate, formatFullDate } from "@/lib/datetime/format";
import type { FinancialUpcomingDue } from "@/types/finance";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Props = {
  data: FinancialUpcomingDue[];
};

export function DueSoon7dCard({ data }: Props) {
  // Calculate summary from the series
  const invoicesDue = data.reduce((sum, d) => sum + d.invoices_count, 0);
  const amountDue = data.reduce((sum, d) => sum + d.due_amount, 0);
  
  // Find today's amount
  const today = new Date().toISOString().split("T")[0];
  const todayData = data.find(d => d.due_day === today);
  const amountToday = todayData?.due_amount ?? 0;

  const chartData = data.map((point) => ({
    date: point.due_day,
    amount: point.due_amount,
    invoices: point.invoices_count,
  }));

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
      <h2 className="text-base font-semibold text-slate-900">
        Vencimientos Próximos (7 Días)
      </h2>

      {/* Mini-KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1 rounded-lg bg-slate-50 p-3">
          <span className="text-xs font-medium text-slate-500">Facturas (7d)</span>
          <span className="text-2xl font-bold text-slate-900">
            {invoicesDue}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg bg-slate-50 p-3">
          <span className="text-xs font-medium text-slate-500">Monto (7d)</span>
          <span className="text-lg font-bold text-slate-900">
            {formatCurrency(amountDue)}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg bg-amber-50 p-3">
          <span className="text-xs font-medium text-amber-700">Vence Hoy</span>
          <span className="text-lg font-bold text-amber-900">
            {formatCurrency(amountToday)}
          </span>
        </div>
      </div>

      {/* Bar Chart */}
      <figure>
        <figcaption className="mb-3 text-sm font-medium text-slate-600">
          Montos Diarios por Vencer (Próximos 7 Días)
        </figcaption>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
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
                  const isToday = data.date === today;
                  return (
                    <div className="rounded-lg bg-slate-900 px-3 py-2 text-white shadow-lg">
                      <p className="text-sm font-medium">
                        {formatFullDate(data.date)}
                        {isToday && " (Hoy)"}
                      </p>
                      <p className="text-sm">
                        {formatCurrency(data.amount)} ({data.invoices} facturas)
                      </p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="amount"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </figure>
    </div>
  );
}
