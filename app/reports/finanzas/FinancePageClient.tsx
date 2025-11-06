"use client";

import { useState } from "react";
import { AgingBucketsCard } from "@/components/reports/finance/AgingBucketsCard";
import { CollectionsTrendCard } from "@/components/reports/finance/CollectionsTrendCard";
import { DueSoonCard } from "@/components/reports/finance/DueSoonCard";
import { TopDebtorsCard } from "@/components/reports/finance/TopDebtorsCard";
import { DebtorsTable } from "@/components/reports/finance/DebtorsTable";
import type { FinanceReport } from "@/types/reports.finance";

const currencyFormatter = new Intl.NumberFormat("es-EC", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat("es-EC");

type Props = {
  data: FinanceReport;
};

export function FinancePageClient({ data }: Props) {
  const [selectedAgingSegment, setSelectedAgingSegment] = useState<string | null>(null);
  const [showDueSoonModal, setShowDueSoonModal] = useState(false);

  const handleAgingSegmentClick = (segment: string) => {
    setSelectedAgingSegment(selectedAgingSegment === segment ? null : segment);
  };

  const handleDueSoonClick = () => {
    setShowDueSoonModal(true);
    // In a full implementation, this would open a modal with the due soon roster
    alert("Modal de vencimientos próximos (implementar según necesidad)");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f2f9ff] via-white to-[#f0fdf4]">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10 lg:px-14">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">
              Informes de gestión
            </span>
            <h1 className="text-3xl font-black text-slate-900 sm:text-[40px]">Panel de finanzas</h1>
            <p className="max-w-2xl text-sm text-slate-600">
              Supervisión de saldos vencidos, cobranzas y vencimientos próximos.
            </p>
          </div>
          <div className="text-xs font-medium uppercase tracking-[0.28em] text-slate-400">
            Actualizado: {new Date(data.last_refreshed_at).toLocaleString("es-EC")}
          </div>
        </header>

        {/* Row 1: Snapshot tiles */}
        <section className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {/* Tile 1: Alumnos con deudas */}
          <article className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/95 p-5 shadow-sm text-slate-800 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <header className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                Alumnos con deudas
              </span>
              <span title="Número de alumnos con saldos pendientes." className="text-xs text-slate-400">
                ℹ
              </span>
            </header>
            <div className="text-3xl font-semibold text-slate-900">
              {integerFormatter.format(data.outstanding_students)}
            </div>
            <div className="text-xs text-slate-500">Con saldos vencidos</div>
          </article>

          {/* Tile 2: Saldo vencido */}
          <article className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/95 p-5 shadow-sm text-slate-800 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <header className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                Saldo vencido
              </span>
              <span title="Suma de todos los saldos vencidos." className="text-xs text-slate-400">
                ℹ
              </span>
            </header>
            <div className="text-3xl font-semibold text-slate-900">
              {currencyFormatter.format(data.outstanding_balance)}
            </div>
            <div className="text-xs text-slate-500">Total pendiente</div>
          </article>

          {/* Tile 3: Cobrado (30 días) */}
          <article className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/95 p-5 shadow-sm text-slate-800 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <header className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                Cobrado (30d)
              </span>
              <span title="Total cobrado en los últimos 30 días." className="text-xs text-slate-400">
                ℹ
              </span>
            </header>
            <div className="text-3xl font-semibold text-slate-900">
              {currencyFormatter.format(data.collections_totals.total_collected_30d)}
            </div>
            <div className="text-xs text-slate-500">Últimos 30 días</div>
          </article>

          {/* Tile 4: Pagos (30 días) */}
          <article className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/95 p-5 shadow-sm text-slate-800 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <header className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                Pagos (30d)
              </span>
              <span title="Número de pagos recibidos en los últimos 30 días." className="text-xs text-slate-400">
                ℹ
              </span>
            </header>
            <div className="text-3xl font-semibold text-slate-900">
              {integerFormatter.format(data.collections_totals.payments_count_30d)}
            </div>
            <div className="text-xs text-slate-500">Transacciones</div>
          </article>
        </section>

        {/* Row 2: Aging buckets */}
        <AgingBucketsCard aging={data.aging} onSegmentClick={handleAgingSegmentClick} />

        {/* Row 3: Collections trend */}
        <CollectionsTrendCard data={data.collections_series} />

        {/* Row 4: Due soon + Top debtors */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <DueSoonCard
            summary={data.due_soon_summary}
            series={data.due_soon_series}
            onViewListClick={handleDueSoonClick}
          />
          <TopDebtorsCard debtors={data.debtors} />
        </section>

        {/* Row 5: Full debtors table */}
        <DebtorsTable debtors={data.debtors} selectedAgingSegment={selectedAgingSegment} />
      </main>
    </div>
  );
}
