"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/datetime/format";
import type { FinancialStudentWithDebt } from "@/types/finance";

type Props = {
  data: FinancialStudentWithDebt[];
  onRowClick: (studentId: number, studentName: string) => void;
};

const ROWS_PER_PAGE = 25;

export function StudentsWithDebtsTable({ data, onRowClick }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof FinancialStudentWithDebt>(
    "overdue_amount",
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
    if (typeof aVal === "boolean" && typeof bVal === "boolean") {
      return (aVal === bVal ? 0 : aVal ? 1 : -1) * direction;
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
    onRowClick(student.student_id, student.student_name);
  };

  const handleKeyDown = (e: React.KeyboardEvent, student: FinancialStudentWithDebt) => {
    if (e.key === "Enter") {
      handleRowClick(student);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
      <h2 className="text-base font-semibold text-slate-900">
        Estudiantes con Deuda ({data.length})
      </h2>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th
                className="cursor-pointer px-3 py-3 text-left font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => handleSort("student_name")}
              >
                Estudiante {sortField === "student_name" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="cursor-pointer px-3 py-3 text-right font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => handleSort("outstanding_amount")}
              >
                Monto Pendiente {sortField === "outstanding_amount" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="cursor-pointer px-3 py-3 text-right font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => handleSort("overdue_amount")}
              >
                Monto Vencido {sortField === "overdue_amount" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="cursor-pointer px-3 py-3 text-right font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => handleSort("overdue_0_30")}
              >
                0-30d {sortField === "overdue_0_30" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="cursor-pointer px-3 py-3 text-right font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => handleSort("overdue_31_60")}
              >
                31-60d {sortField === "overdue_31_60" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="cursor-pointer px-3 py-3 text-right font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => handleSort("overdue_61_90")}
              >
                61-90d {sortField === "overdue_61_90" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="cursor-pointer px-3 py-3 text-right font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => handleSort("overdue_90_plus")}
              >
                90+d {sortField === "overdue_90_plus" && (sortDirection === "asc" ? "↑" : "↓")}
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
                  {student.student_name}
                </td>
                <td className="px-3 py-3 text-right font-semibold text-slate-900">
                  {formatCurrency(student.outstanding_amount)}
                </td>
                <td className="px-3 py-3 text-right font-semibold text-rose-600">
                  {formatCurrency(student.overdue_amount)}
                </td>
                <td className="px-3 py-3 text-right text-slate-700">
                  {formatCurrency(student.overdue_0_30)}
                </td>
                <td className="px-3 py-3 text-right text-slate-700">
                  {formatCurrency(student.overdue_31_60)}
                </td>
                <td className="px-3 py-3 text-right text-slate-700">
                  {formatCurrency(student.overdue_61_90)}
                </td>
                <td className="px-3 py-3 text-right text-rose-600">
                  {formatCurrency(student.overdue_90_plus)}
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
            Página {currentPage} de {totalPages} ({data.length} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
