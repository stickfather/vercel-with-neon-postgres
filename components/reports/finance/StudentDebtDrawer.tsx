"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatFullDate } from "@/lib/datetime/format";
import type { FinancialOverdueItem } from "@/types/finance";

type Props = {
  isOpen: boolean;
  studentId: number | null;
  studentName: string;
  onClose: () => void;
};

export function StudentDebtDrawer({
  isOpen,
  studentId,
  studentName,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [overdueItems, setOverdueItems] = useState<FinancialOverdueItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !studentId) {
      setOverdueItems([]);
      setError(null);
      return;
    }

    async function fetchOverdueItems() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/reports/finance/student-debt?studentId=${studentId}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch overdue items");
        }
        const data = await response.json();
        setOverdueItems(data.overdueItems || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setOverdueItems([]);
      } finally {
        setLoading(false);
      }
    }

    fetchOverdueItems();
  }, [isOpen, studentId]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const subtotal = overdueItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[560px] flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Debt Breakdown
            </h2>
            <p className="text-sm text-slate-600">{studentName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close drawer"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-rose-50 p-4 text-sm text-rose-800">
              {error}
            </div>
          )}

          {!loading && !error && overdueItems.length === 0 && (
            <div className="py-12 text-center text-sm text-slate-500">
              No overdue items found
            </div>
          )}

          {!loading && !error && overdueItems.length > 0 && (
            <div className="flex flex-col gap-3">
              {overdueItems.map((item) => (
                <div
                  key={item.payment_id}
                  className="flex flex-col gap-2 rounded-lg border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-slate-500">
                        Invoice #{item.payment_id}
                      </span>
                      <span className="text-sm text-slate-700">
                        Due: {formatFullDate(item.due_date)}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-slate-900">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700">
                      {item.days_overdue} days overdue
                    </span>
                    {item.is_paid && item.received_date && (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                        Paid: {formatFullDate(item.received_date)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Subtotal */}
        {!loading && !error && overdueItems.length > 0 && (
          <div className="border-t border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-slate-900">
                Total Overdue
              </span>
              <span className="text-2xl font-black text-slate-900">
                {formatCurrency(subtotal)}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
