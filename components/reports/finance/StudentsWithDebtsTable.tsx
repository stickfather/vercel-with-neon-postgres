"use client";

import { useState } from "react";
import { formatCurrency, formatFullDate } from "@/lib/datetime/format";
import type { FinancialStudentWithDebt } from "@/types/finance";

type Props = {
  data: FinancialStudentWithDebt[];
  onRowClick: (studentId: number, studentName: string) => void;
};

const ROWS_PER_PAGE = 25;

export function StudentsWithDebtsTable({ data, onRowClick }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof FinancialStudentWithDebt>(
    "total_overdue_amount",
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Sort data
  const sortedData = [...data].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    const direction = sortDirection === "asc" ? 1 : -1;

    if (typeof aVal === "number" && typeof bVal === "number") {
      return (aVal - bVal) * direction;
    }
    if (typeof aVal === "string" && typeof bVal === "string") {
      return aVal.localeCompare(bVal) * direction;
    }
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedData.length / ROWS_PER_PAGE);
  const startIdx = (currentPage - 1) * ROWS_PER_PAGE;
  const endIdx = startIdx + ROWS_PER_PAGE;
  const paginatedData = sortedData.slice(startIdx, endIdx);

  const handleSort = (field: keyof FinancialStudentWithDebt) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleRowClick = (student: FinancialStudentWithDebt) => {
    onRowClick(student.student_id, student.full_name);
  };

  const handleKeyDown = (e: React.KeyboardEvent, student: FinancialStudentWithDebt) => {
    if (e.key === "Enter") {
      handleRowClick(student);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
      <h2 className="text-base font-semibold text-slate-900">
        Students with Debt ({data.length})
      </h2>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th
                className="cursor-pointer px-3 py-3 text-left font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => handleSort("full_name")}
              >
                Student {sortField === "full_name" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="cursor-pointer px-3 py-3 text-right font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => handleSort("total_overdue_amount")}
              >
                Overdue Amount {sortField === "total_overdue_amount" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="cursor-pointer px-3 py-3 text-right font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => handleSort("max_days_overdue")}
              >
                Max Days {sortField === "max_days_overdue" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="cursor-pointer px-3 py-3 text-left font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => handleSort("oldest_due_date")}
              >
                First Debt {sortField === "oldest_due_date" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="cursor-pointer px-3 py-3 text-left font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => handleSort("most_recent_missed_due_date")}
              >
                Latest Missed {sortField === "most_recent_missed_due_date" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="cursor-pointer px-3 py-3 text-right font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => handleSort("open_invoices")}
              >
                Invoices {sortField === "open_invoices" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((student) => (
              <tr
                key={student.student_id}
                className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                onClick={() => handleRowClick(student)}
                onKeyDown={(e) => handleKeyDown(e, student)}
                tabIndex={0}
              >
                <td className="px-3 py-3 font-medium text-slate-900">
                  {student.full_name}
                </td>
                <td className="px-3 py-3 text-right font-semibold text-slate-900">
                  {formatCurrency(student.total_overdue_amount)}
                </td>
                <td className="px-3 py-3 text-right text-slate-700">
                  {student.max_days_overdue}
                </td>
                <td className="px-3 py-3 text-slate-700">
                  {formatFullDate(student.oldest_due_date)}
                </td>
                <td className="px-3 py-3 text-slate-700">
                  {formatFullDate(student.most_recent_missed_due_date)}
                </td>
                <td className="px-3 py-3 text-right text-slate-700">
                  {student.open_invoices}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">
            Page {currentPage} of {totalPages} ({data.length} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
