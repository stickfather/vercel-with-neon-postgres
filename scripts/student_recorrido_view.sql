CREATE OR REPLACE VIEW mart.v_student_recorrido AS
WITH plan_lessons AS (
    SELECT
        spl.student_id,
        lg.lesson_id,
        lg.level AS level_code,
        lg.seq AS seq_number,
        lg.lesson_global_seq,
        l.lesson AS lesson_title
    FROM mart.student_plan_lessons_v spl
    JOIN mart.lessons_global_v lg
      ON lg.lesson_id = spl.lesson_id
    JOIN public.lessons l
      ON l.id = lg.lesson_id
),
level_boundaries AS (
    SELECT
        student_id,
        level_code,
        MAX(seq_number) AS max_seq_in_level
    FROM plan_lessons
    GROUP BY student_id, level_code
),
lesson_plan AS (
    SELECT
        pl.student_id,
        pl.lesson_id,
        pl.level_code,
        pl.seq_number,
        pl.lesson_global_seq,
        pl.lesson_title,
        CASE
            WHEN pl.level_code = 'A1' AND pl.seq_number = 0 THEN 'intro'
            WHEN lb.max_seq_in_level IS NOT NULL AND pl.seq_number = lb.max_seq_in_level THEN 'exam'
            ELSE NULL
        END AS special_type
    FROM plan_lessons pl
    LEFT JOIN level_boundaries lb
      ON lb.student_id = pl.student_id
     AND lb.level_code = pl.level_code
),
attendance_totals AS (
    SELECT
        sa.student_id,
        sa.lesson_id,
        SUM(
            CASE
                WHEN sa.checkout_time IS NOT NULL THEN
                    GREATEST(0, EXTRACT(EPOCH FROM (sa.checkout_time - sa.checkin_time)))
                ELSE 0
            END
        ) / 60.0 AS minutes_spent,
        COUNT(DISTINCT DATE(COALESCE(sa.checkout_time, sa.checkin_time))) AS calendar_days_spent,
        (COUNT(*) > 0) AS has_activity
    FROM public.student_attendance sa
    GROUP BY sa.student_id, sa.lesson_id
),
merged AS (
    SELECT
        lp.student_id,
        lp.lesson_id,
        lp.level_code,
        lp.seq_number,
        lp.lesson_global_seq,
        lp.lesson_title,
        lp.special_type,
        COALESCE(at.minutes_spent, 0) AS minutes_spent,
        COALESCE(at.calendar_days_spent, 0) AS calendar_days_spent,
        COALESCE(at.has_activity, FALSE) AS has_activity
    FROM lesson_plan lp
    LEFT JOIN attendance_totals at
      ON at.student_id = lp.student_id
     AND at.lesson_id = lp.lesson_id
),
level_totals AS (
    SELECT
        student_id,
        level_code,
        MAX(CASE WHEN has_activity THEN seq_number END) AS highest_seq_with_activity,
        COUNT(*) AS total_lessons_in_level
    FROM merged
    GROUP BY student_id, level_code
)
SELECT
    m.student_id,
    m.lesson_id,
    m.level_code,
    m.seq_number,
    m.lesson_global_seq,
    m.lesson_title,
    m.special_type,
    m.minutes_spent,
    m.calendar_days_spent,
    m.has_activity,
    lt.highest_seq_with_activity,
    lt.total_lessons_in_level
FROM merged m
JOIN level_totals lt
  ON lt.student_id = m.student_id
 AND lt.level_code = m.level_code;
