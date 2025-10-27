CREATE OR REPLACE VIEW mart.v_student_recorrido AS
WITH level_order AS (
    SELECT 'A1'::text AS level_code, 1 AS level_rank UNION ALL
    SELECT 'A2'::text, 2 UNION ALL
    SELECT 'B1'::text, 3 UNION ALL
    SELECT 'B2'::text, 4 UNION ALL
    SELECT 'C1'::text, 5 UNION ALL
    SELECT 'C2'::text, 6
),
lesson_catalog_base AS (
    SELECT
        lg.lesson_id,
        UPPER(TRIM(lg.level)) AS level_code,
        COALESCE(lo.level_rank, 999) AS level_rank,
        lg.seq AS lesson_global_seq,
        ROW_NUMBER() OVER (PARTITION BY UPPER(TRIM(lg.level)) ORDER BY lg.seq) AS level_position,
        COUNT(*) OVER (PARTITION BY UPPER(TRIM(lg.level))) AS level_count,
        l.lesson AS lesson_title
    FROM mart.lessons_global_v lg
    JOIN public.lessons l
      ON l.id = lg.lesson_id
    LEFT JOIN level_order lo
      ON lo.level_code = UPPER(TRIM(lg.level))
),
lesson_catalog AS (
    SELECT
        lesson_id,
        level_code,
        level_rank,
        lesson_global_seq,
        (level_position - 1) AS seq_number,
        lesson_title,
        CASE
            WHEN level_code = 'A1' AND level_position = 1 THEN 'intro'
            WHEN level_position = level_count THEN 'exam'
            ELSE NULL
        END AS special_type
    FROM lesson_catalog_base
),
student_ranges AS (
    SELECT
        s.id AS student_id,
        COALESCE(lo_min.level_rank, 1) AS min_rank,
        COALESCE(lo_max.level_rank, (SELECT MAX(level_rank) FROM level_order)) AS max_rank
    FROM public.students s
    LEFT JOIN level_order lo_min
      ON lo_min.level_code = UPPER(TRIM(s.planned_level_min))
    LEFT JOIN level_order lo_max
      ON lo_max.level_code = UPPER(TRIM(s.planned_level_max))
),
normalized_ranges AS (
    SELECT
        student_id,
        LEAST(min_rank, max_rank) AS min_rank,
        GREATEST(min_rank, max_rank) AS max_rank
    FROM student_ranges
),
plan_lessons AS (
    SELECT DISTINCT
        spl.student_id,
        lc.lesson_id,
        lc.level_code,
        lc.seq_number,
        lc.lesson_global_seq,
        lc.lesson_title,
        lc.special_type
    FROM mart.student_plan_lessons_v spl
    JOIN lesson_catalog lc
      ON lc.lesson_id = spl.lesson_id
),
range_lessons AS (
    SELECT
        nr.student_id,
        lc.lesson_id,
        lc.level_code,
        lc.seq_number,
        lc.lesson_global_seq,
        lc.lesson_title,
        lc.special_type
    FROM normalized_ranges nr
    JOIN lesson_catalog lc
      ON lc.level_rank BETWEEN nr.min_rank AND nr.max_rank
),
lesson_plan AS (
    SELECT DISTINCT
        combined.student_id,
        combined.lesson_id,
        combined.level_code,
        combined.seq_number,
        combined.lesson_global_seq,
        combined.lesson_title,
        combined.special_type
    FROM (
        SELECT * FROM plan_lessons
        UNION ALL
        SELECT * FROM range_lessons
    ) AS combined
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
