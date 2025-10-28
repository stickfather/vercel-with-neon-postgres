import { NextRequest, NextResponse } from "next/server";

import { listStudentLessonJourneyLessons } from "@/features/administration/data/student-profile";
import { readRouteParam, resolveRouteParams } from "@/lib/api/route-params";

export const dynamic = "force-dynamic";

function normalizeStudentId(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(_request: NextRequest, context: any) {
  const params = await resolveRouteParams(context);
  const studentParam = readRouteParam(params, "studentId");
  const studentId = normalizeStudentId(studentParam ?? "");

  if (studentId == null) {
    return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    const journey = await listStudentLessonJourneyLessons(studentId);
    const levels = journey.levels.map((level) => {
      const highestCompletedSeq = level.lessons
        .filter((lesson) => lesson.status !== "upcoming")
        .reduce<number | null>((acc, lesson) => {
          if (acc == null || lesson.lessonGlobalSeq > acc) {
            return lesson.lessonGlobalSeq;
          }
          return acc;
        }, null);

      return {
        level_code: level.levelCode,
        order: Number.isFinite(level.order) ? level.order : null,
        highest_seq_with_activity: highestCompletedSeq,
        total_lessons_in_level: level.lessons.length,
        lessons: level.lessons.map((lesson) => ({
          lesson_id: lesson.lessonId,
          lesson_level_seq: lesson.lessonLevelSeq,
          lesson_global_seq: lesson.lessonGlobalSeq,
          lesson_title: lesson.lessonTitle,
          lesson_name: lesson.lessonTitle,
          display_label: lesson.displayLabel,
          is_intro: lesson.isIntro,
          is_exam: lesson.isExam,
          level_code: lesson.levelCode,
          status: lesson.status,
          hours_in_lesson: lesson.hoursInLesson,
          days_in_lesson: lesson.daysInLesson,
          minutes_spent: Math.round(lesson.hoursInLesson * 60),
          calendar_days_spent: lesson.daysInLesson,
          has_activity:
            lesson.status !== "upcoming" ||
            lesson.hoursInLesson > 0 ||
            lesson.daysInLesson > 0,
        })),
      };
    });

    const lessons = journey.lessons.map((lesson) => ({
      lesson_id: lesson.lessonId,
      lesson: lesson.displayLabel,
      seq: lesson.lessonLevelSeq ?? lesson.lessonGlobalSeq,
      lesson_level_seq: lesson.lessonLevelSeq,
      lesson_global_seq: lesson.lessonGlobalSeq,
      level: lesson.levelCode,
      status: lesson.status,
      hours_in_lesson: lesson.hoursInLesson,
      days_in_lesson: lesson.daysInLesson,
      is_intro: lesson.isIntro,
      is_exam: lesson.isExam,
      lesson_name: lesson.lessonTitle,
      display_label: lesson.displayLabel,
    }));

    const summarySource = journey.planSummary;
    const fallbackTotal = lessons.length;
    const fallbackCompleted = lessons.filter((lesson) => lesson.status === "completed").length;
    const fallbackProgress =
      fallbackTotal > 0 ? Number(((fallbackCompleted / fallbackTotal) * 100).toFixed(1)) : null;

    const summary = summarySource
      ? {
          level_min: summarySource.levelMin,
          level_max: summarySource.levelMax,
          progress_pct_plan:
            summarySource.progressPctPlan != null && Number.isFinite(summarySource.progressPctPlan)
              ? summarySource.progressPctPlan
              : fallbackProgress,
          completed_lessons_in_plan:
            summarySource.completedLessonsInPlan != null &&
            Number.isFinite(summarySource.completedLessonsInPlan)
              ? summarySource.completedLessonsInPlan
              : fallbackCompleted,
          total_lessons_in_plan:
            summarySource.totalLessonsInPlan != null && Number.isFinite(summarySource.totalLessonsInPlan)
              ? summarySource.totalLessonsInPlan
              : fallbackTotal,
        }
      : {
          level_min: journey.plannedLevelMin,
          level_max: journey.plannedLevelMax,
          progress_pct_plan: fallbackProgress,
          completed_lessons_in_plan: fallbackCompleted,
          total_lessons_in_plan: fallbackTotal,
        };

    return NextResponse.json(
      {
        student_id: studentId,
        planned_level_min: journey.plannedLevelMin,
        planned_level_max: journey.plannedLevelMax,
        summary,
        levels,
        lessons,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=60",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching student lesson recorrido", error);
    return NextResponse.json(
      { error: "No se pudo obtener el recorrido de lecciones." },
      { status: 500 },
    );
  }
}
