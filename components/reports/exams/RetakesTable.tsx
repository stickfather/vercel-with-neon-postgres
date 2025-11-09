import { format, parseISO, differenceInDays } from "date-fns";
import type { ExamRetake } from "@/types/exams";

type Props = {
  data: ExamRetake[];
};

export function RetakesTable({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          Retakes Overview (90d)
        </h3>
        <div className="flex h-32 items-center justify-center text-slate-500">
          No retake data available for the last 90 days.
        </div>
      </section>
    );
  }

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd MMM");
    } catch {
      return "—";
    }
  };

  const getRowAccentColor = (firstScore: number | null, retakeScore: number | null) => {
    if (firstScore === null || retakeScore === null) return "";
    const delta = retakeScore - firstScore;
    if (delta >= 10) return "border-l-4 border-l-emerald-500";
    if (delta < 0) return "border-l-4 border-l-rose-500";
    return "";
  };

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">
        Retakes Overview (90d)
        <span className="ml-2 text-xs font-normal text-slate-500">
          • Showing fails from last 90 days and their retakes
        </span>
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                Student
              </th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                Exam Type
              </th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                Level
              </th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                First Fail
              </th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                Retake
              </th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">
                ΔDays
              </th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">
                First Score
              </th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700">
                Retake Score
              </th>
              <th className="px-3 py-2 text-center font-semibold text-slate-700">
                Retake Passed
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={`${row.student_id}-${row.exam_type}-${row.level}-${idx}`}
                className={`border-b border-slate-100 hover:bg-slate-50 ${getRowAccentColor(
                  row.first_score,
                  row.retake_score,
                )}`}
              >
                <td className="px-3 py-3 text-slate-900">
                  Student #{row.student_id}
                </td>
                <td className="px-3 py-3 text-slate-700">{row.exam_type}</td>
                <td className="px-3 py-3 text-slate-700">{row.level}</td>
                <td className="px-3 py-3 text-slate-700">
                  {formatDate(row.first_fail_at)}
                </td>
                <td className="px-3 py-3 text-slate-700">
                  {row.retake_at ? formatDate(row.retake_at) : "—"}
                </td>
                <td className="px-3 py-3 text-right text-slate-700">
                  {row.days_to_retake !== null ? row.days_to_retake : "—"}
                </td>
                <td className="px-3 py-3 text-right font-medium text-slate-900">
                  {row.first_score !== null ? row.first_score.toFixed(0) : "—"}
                </td>
                <td className="px-3 py-3 text-right font-medium text-slate-900">
                  {row.retake_score !== null
                    ? row.retake_score.toFixed(0)
                    : "—"}
                </td>
                <td className="px-3 py-3 text-center">
                  {row.retake_passed === null ? (
                    <span className="text-slate-400">—</span>
                  ) : row.retake_passed ? (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      ✓
                    </span>
                  ) : (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                      ✗
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
