import type { ExamInstructiveCompliance } from "@/types/exams";

type Props = {
  data: ExamInstructiveCompliance | null;
};

export function InstructiveComplianceCard({ data }: Props) {
  const assignedPct = data?.assigned_pct !== null && data?.assigned_pct !== undefined
    ? data.assigned_pct * 100
    : null;
  const completedPct = data?.completed_pct !== null && data?.completed_pct !== undefined
    ? data.completed_pct * 100
    : null;

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-sm">
      <header className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Instructive (90d)
        </h3>
      </header>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-slate-900">
              {assignedPct !== null ? `${assignedPct.toFixed(1)}%` : "—"}
            </span>
            <span className="text-xs text-slate-500">Assigned</span>
          </div>
          <div className="h-12 w-px bg-slate-200" />
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-slate-900">
              {completedPct !== null ? `${completedPct.toFixed(1)}%` : "—"}
            </span>
            <span className="text-xs text-slate-500">Completed</span>
          </div>
        </div>
        <p className="text-xs text-slate-500">On failed exams only</p>
      </div>
    </section>
  );
}
