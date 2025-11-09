import type { ExamStrugglingStudentDetail } from "@/types/exams";

type Props = {
  data: ExamStrugglingStudentDetail[];
};

export function StrugglingStudentsTable({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          Students Requiring Attention (last 180 days)
        </h3>
        <div className="flex h-32 items-center justify-center text-slate-500">
          No students requiring attention at this time.
        </div>
      </section>
    );
  }

  const getSeverityChip = (reason: string) => {
    const reasonMap: Record<
      string,
      { label: string; className: string }
    > = {
      consecutive_fails: {
        label: "Consecutive Fails",
        className: "bg-rose-100 text-rose-700 border-rose-200",
      },
      multiple_failed_exams: {
        label: "Multiple Failures",
        className: "bg-amber-100 text-amber-700 border-amber-200",
      },
      low_scores: {
        label: "Low Scores",
        className: "bg-slate-100 text-slate-700 border-slate-200",
      },
      unresolved_instructivo: {
        label: "Unresolved Instructive",
        className: "bg-sky-100 text-sky-700 border-sky-200",
      },
    };

    const config = reasonMap[reason] || {
      label: reason,
      className: "bg-slate-100 text-slate-600 border-slate-200",
    };

    return (
      <span
        className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${config.className}`}
      >
        {config.label}
      </span>
    );
  };

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">
        Students Requiring Attention (last 180 days)
        <span className="ml-2 text-xs font-normal text-slate-500">
          • Top 20 by risk factors
        </span>
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                Student
              </th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">
                Failed (180d)
              </th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">
                Max Consecutive
              </th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">
                Min Score (180d)
              </th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">
                Open Instructivos
              </th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                Reason
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((student, idx) => (
              <tr
                key={`${student.student_id}-${idx}`}
                className="border-b border-slate-100 hover:bg-slate-50"
              >
                <td className="px-3 py-3 font-medium text-slate-900">
                  {student.full_name || `Student #${student.student_id}`}
                </td>
                <td className="px-3 py-3 text-right text-slate-700">
                  {student.failed_exam_count}
                </td>
                <td className="px-3 py-3 text-right font-medium text-slate-900">
                  {student.max_consecutive_fails}
                </td>
                <td className="px-3 py-3 text-right text-slate-700">
                  {student.min_score_180d !== null
                    ? student.min_score_180d.toFixed(0)
                    : "—"}
                </td>
                <td className="px-3 py-3 text-right text-slate-700">
                  {student.open_instructivos}
                </td>
                <td className="px-3 py-3">{getSeverityChip(student.reason)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
