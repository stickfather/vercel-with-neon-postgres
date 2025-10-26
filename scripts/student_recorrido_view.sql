CREATE OR REPLACE VIEW mart.student_recorrido_v AS
WITH cur AS (
    SELECT
        p.student_id,
        p.current_global_seq_in_plan
    FROM mart.student_plan_progress_v p
),
max_seq_per_level AS (
    SELECT
        l.level,
        MAX(l.seq) AS max_seq_in_level
    FROM public.lessons l
    GROUP BY l.level
)
SELECT
    e.student_id,
    e.lesson_id,
    e.level,
    e.seq,
    l.lesson                               AS lesson_name,
    e.total_hours                          AS hours_spent,
    e.active_days_for_lesson               AS calendar_days_spent,
    (e.seq = 0 AND e.level = 'A1')         AS is_intro_booklet,
    (e.seq = m.max_seq_in_level)           AS is_exam,
    (lg.lesson_global_seq = c.current_global_seq_in_plan)
                                            AS is_current_lesson,
    (lg.lesson_global_seq < c.current_global_seq_in_plan)
                                            AS is_completed
FROM mart.student_lesson_effort_v e
JOIN public.lessons l
  ON l.id = e.lesson_id
JOIN mart.student_plan_lessons_v spl
  ON spl.student_id = e.student_id
 AND spl.lesson_id  = e.lesson_id
JOIN mart.lessons_global_v lg
  ON lg.lesson_id = e.lesson_id
LEFT JOIN cur c
  ON c.student_id = e.student_id
JOIN max_seq_per_level m
  ON m.level = e.level;
