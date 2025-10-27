CREATE OR REPLACE VIEW mart.v_student_recorrido AS
WITH lesson_plan AS (
    SELECT
        spl.student_id,
        l.id AS lesson_id,
        l.level AS level_code,
        l.seq AS seq_number,
        l.lesson AS lesson_title,
        CASE
            WHEN l.level = 'A1' AND l.seq = 0 THEN 'intro'
            WHEN l.seq = max_seq.max_seq_in_level THEN 'exam'
            ELSE NULL
        END AS special_type
    FROM mart.student_plan_lessons_v spl
    JOIN public.lessons l
      ON l.id = spl.lesson_id
    JOIN (
        SELECT level, MAX(seq) AS max_seq_in_level
        FROM public.lessons
        GROUP BY level
    ) AS max_seq
      ON max_seq.level = l.level
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
    m.lesson_title,
    m.special_type,
    m.minutes_spent,
    m.calendar_days_spent,
    m.has_activity,
    lt.highest_seq_with_activity,
    lt.total_lessons_in_level,
    lg.lesson_global_seq
FROM merged m
JOIN level_totals lt
  ON lt.student_id = m.student_id
 AND lt.level_code = m.level_code
LEFT JOIN mart.lessons_global_v lg
  ON lg.lesson_id = m.lesson_id;
