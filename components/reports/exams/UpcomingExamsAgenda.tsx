import { format, parseISO, differenceInDays } from "date-fns";
import type { ExamUpcoming30dCount, ExamUpcoming30dEntry } from "@/types/exams";

type Props = {
  count: ExamUpcoming30dCount | null;
  list: ExamUpcoming30dEntry[];
};

export function UpcomingExamsAgenda({ count, list }: Props) {
  const totalCount = count?.upcoming_exams_30d ?? list.length;

  if (!list || list.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          Upcoming (30 days)
        </h3>
        <div className="flex h-32 items-center justify-center text-slate-500">
          No upcoming exams in the next 30 days.
        </div>
      </section>
    );
  }

  // Group by exam_date
  const groupedByDate = list.reduce(
    (acc, exam) => {
      if (!acc[exam.exam_date]) {
        acc[exam.exam_date] = [];
      }
      acc[exam.exam_date].push(exam);
      return acc;
    },
    {} as Record<string, ExamUpcoming30dEntry[]>,
  );

  const sortedDates = Object.keys(groupedByDate).sort();

  const formatTime = (timeStr: string) => {
    try {
      return format(parseISO(timeStr), "HH:mm");
    } catch {
      return "";
    }
  };

  const formatGroupDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      return format(date, "EEE dd MMM");
    } catch {
      return dateStr;
    }
  };

  const getDaysUntil = (dateStr: string) => {
    try {
      const examDate = parseISO(dateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const days = differenceInDays(examDate, today);
      if (days === 0) return "today";
      if (days === 1) return "in 1 day";
      return `in ${days} days`;
    } catch {
      return "";
    }
  };

  const getExamTypeBadge = (type: string) => {
    return (
      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
        {type}
      </span>
    );
  };

  const getLevelPill = (level: string) => {
    return (
      <span className="inline-flex items-center rounded-full border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
        {level}
      </span>
    );
  };

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-sm">
      <header className="mb-4 flex items-center gap-3">
        <h3 className="text-lg font-semibold text-slate-900">
          Upcoming (30 days)
        </h3>
        <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-sky-100 px-2 text-xs font-semibold text-sky-700">
          {totalCount}
        </span>
      </header>

      <div className="flex flex-col gap-4">
        {sortedDates.map((date) => {
          const exams = groupedByDate[date];
          return (
            <div key={date} className="flex flex-col gap-2">
              {/* Sticky Group Header */}
              <div className="sticky top-0 z-10 flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
                <span className="text-sm font-semibold text-slate-900">
                  {formatGroupDate(date)}
                </span>
                <span className="text-xs text-slate-600">
                  • {exams.length} exam{exams.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Exam Items */}
              {exams.map((exam, idx) => (
                <div
                  key={`${exam.student_id}-${exam.exam_type}-${idx}`}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-4">
                    <span className="min-w-[48px] text-sm font-medium text-slate-900">
                      {formatTime(exam.time_scheduled_local)}
                    </span>
                    <span className="text-sm text-slate-700">
                      {exam.full_name}
                    </span>
                    <div className="flex items-center gap-2">
                      {getExamTypeBadge(exam.exam_type)}
                      {getLevelPill(exam.level)}
                    </div>
                    <span className="text-xs text-slate-500">
                      {exam.status}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {getDaysUntil(exam.exam_date)}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
