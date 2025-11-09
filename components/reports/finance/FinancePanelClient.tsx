"use client";

import { useEffect, useState } from "react";
import { OutstandingKpiCards } from "./OutstandingKpiCards";
import { AgingBucketsCard } from "./AgingBucketsCard";
import { Collections30dCard } from "./Collections30dCard";
import { DueSoon7dCard } from "./DueSoon7dCard";
import { StudentsWithDebtsTable } from "./StudentsWithDebtsTable";
import { StudentDebtDrawer } from "./StudentDebtDrawer";
import { MicroKpiStrip } from "./MicroKpiStrip";
import type { FinancePanelData } from "@/types/finance";

type DrawerState = {
  isOpen: boolean;
  studentId: number | null;
  studentName: string;
};

export function FinancePanelClient() {
  const [data, setData] = useState<FinancePanelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<DrawerState>({
    isOpen: false,
    studentId: null,
    studentName: "",
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/reports/finance");
        if (!response.ok) {
          throw new Error("Failed to fetch finance data");
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleOpenDrawer = (studentId: number, studentName: string) => {
    setDrawer({
      isOpen: true,
      studentId,
      studentName,
    });
  };

  const handleCloseDrawer = () => {
    setDrawer({
      isOpen: false,
      studentId: null,
      studentName: "",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        {/* KPI Cards Skeleton */}
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl bg-slate-200/60"
            />
          ))}
        </div>
        {/* Charts Skeleton */}
        <div className="h-80 animate-pulse rounded-2xl bg-slate-200/60" />
        <div className="h-80 animate-pulse rounded-2xl bg-slate-200/60" />
        <div className="h-80 animate-pulse rounded-2xl bg-slate-200/60" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <p className="text-sm text-rose-800">
          We couldn't load this data. Try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Module 2: Outstanding KPI Cards */}
      <OutstandingKpiCards
        studentsData={data.outstandingStudents}
        balanceData={data.outstandingBalance}
      />

      {/* Module 8: Operational Micro-KPIs (Derived) */}
      <MicroKpiStrip
        agingBuckets={data.agingBuckets}
        outstandingStudents={data.outstandingStudents}
        outstandingBalance={data.outstandingBalance}
        collections30d={data.collections30d}
      />

      {/* Module 3: Aging Buckets */}
      <AgingBucketsCard data={data.agingBuckets} />

      {/* Module 4: Collections (30d) */}
      <Collections30dCard
        summary={data.collections30d}
        series={data.collections30dSeries}
      />

      {/* Module 5: Due Soon (7d) */}
      <DueSoon7dCard
        summary={data.dueSoonSummary}
        series={data.dueSoonSeries}
      />

      {/* Module 6: Students with Debts Table */}
      <StudentsWithDebtsTable
        data={data.studentsWithDebts}
        onRowClick={handleOpenDrawer}
      />

      {/* Module 7: Student Debt Breakdown Drawer */}
      <StudentDebtDrawer
        isOpen={drawer.isOpen}
        studentId={drawer.studentId}
        studentName={drawer.studentName}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}
