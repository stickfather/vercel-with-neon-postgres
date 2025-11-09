-- ============================================================================
-- EXAMS PANEL - Required Database Views (mgmt schema)
-- ============================================================================
-- This file documents the expected structure of views required by the Exams
-- panel. These are examples - actual implementations should match your schema.
-- ============================================================================

-- NOTE: All views should enforce the appropriate time windows as documented.

-- ----------------------------------------------------------------------------
-- 1. Pass Rate (90d)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW mgmt.exam_overall_pass_rate_90d_v AS
SELECT
  COUNT(*) FILTER (WHERE is_passed) ::numeric / NULLIF(COUNT(*),0) ::numeric AS pass_rate_90d
FROM mgmt.exam_completed_exams_v
WHERE exam_date >= (current_date - interval '90 days');

-- ----------------------------------------------------------------------------
-- 2. Average Score (90d)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW mgmt.exam_average_score_90d_v AS
SELECT
  AVG(score)::numeric(10,2) AS average_score_90d
FROM mgmt.exam_completed_exams_v
WHERE score IS NOT NULL
  AND exam_date >= (current_date - interval '90 days');

-- ----------------------------------------------------------------------------
-- 3. Completed Exams (Base View)
-- ----------------------------------------------------------------------------
-- This is the primary view used by multiple modules. Must include:
-- exam_id, student_id, full_name, exam_type, level,
-- time_scheduled, time_scheduled_local, exam_date,
-- score, is_passed
CREATE OR REPLACE VIEW mgmt.exam_completed_exams_v AS
SELECT
  e.exam_id,
  e.student_id,
  s.full_name,
  e.exam_type,
  e.level,
  e.time_scheduled AT TIME ZONE 'UTC' AS time_scheduled,
  e.time_scheduled AT TIME ZONE 'America/Guayaquil' AS time_scheduled_local,
  (e.time_scheduled AT TIME ZONE 'America/Guayaquil')::date AS exam_date,
  e.score,
  e.is_passed
FROM exams e
JOIN students s ON e.student_id = s.student_id
WHERE e.status = 'completed'
ORDER BY e.time_scheduled DESC;

-- ----------------------------------------------------------------------------
-- 4. Instructive Follow-up
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW mgmt.exam_instructivo_followup_v AS
SELECT
  ef.failed_at,
  (i.instructivo_id IS NOT NULL) AS assigned,
  (i.completed_at IS NOT NULL) AS completed
FROM exam_failures ef
LEFT JOIN instructivos i ON i.exam_failure_id = ef.id;

-- ----------------------------------------------------------------------------
-- 5. Weekly KPIs
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW mgmt.exam_weekly_kpis_v AS
SELECT
  DATE_TRUNC('week', exam_date)::date AS week_start,
  COUNT(*) FILTER (WHERE is_passed) AS passed_count,
  COUNT(*) FILTER (WHERE NOT is_passed) AS failed_count,
  COUNT(*) AS completed_count,
  COUNT(*) FILTER (WHERE is_passed)::numeric / NULLIF(COUNT(*),0)::numeric AS pass_rate
FROM mgmt.exam_completed_exams_v
GROUP BY DATE_TRUNC('week', exam_date)
ORDER BY week_start;

-- ----------------------------------------------------------------------------
-- 6. Score Distribution (90d)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW mgmt.exam_score_dist_90d_v AS
SELECT
  (FLOOR(score / 5) * 5)::text || '-' || (FLOOR(score / 5) * 5 + 5)::text AS bin_5pt,
  COUNT(*) AS n
FROM mgmt.exam_completed_exams_v
WHERE score IS NOT NULL
  AND exam_date >= (current_date - interval '90 days')
GROUP BY FLOOR(score / 5)
ORDER BY FLOOR(score / 5);

-- ----------------------------------------------------------------------------
-- 7. Retakes (90d)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW mgmt.exam_retakes_v AS
WITH first_fails AS (
  SELECT DISTINCT ON (student_id, exam_type, level)
    student_id,
    exam_type,
    level,
    time_scheduled_local AS first_fail_at,
    score AS first_score
  FROM mgmt.exam_completed_exams_v
  WHERE NOT is_passed
  ORDER BY student_id, exam_type, level, time_scheduled_local
),
retakes AS (
  SELECT DISTINCT ON (ff.student_id, ff.exam_type, ff.level)
    ff.*,
    e.time_scheduled_local AS retake_at,
    e.score AS retake_score,
    e.is_passed AS retake_passed,
    EXTRACT(day FROM e.time_scheduled_local - ff.first_fail_at)::integer AS days_to_retake
  FROM first_fails ff
  JOIN mgmt.exam_completed_exams_v e
    ON e.student_id = ff.student_id
    AND e.exam_type = ff.exam_type
    AND e.level = ff.level
    AND e.time_scheduled_local > ff.first_fail_at
  ORDER BY ff.student_id, ff.exam_type, ff.level, e.time_scheduled_local
)
SELECT * FROM retakes;

-- ----------------------------------------------------------------------------
-- 8. Students Requiring Attention (180d)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW mgmt.exam_students_struggling_v AS
WITH student_metrics AS (
  SELECT
    student_id,
    full_name,
    COUNT(*) FILTER (WHERE NOT is_passed) AS failed_exam_count,
    MIN(score) AS min_score_180d,
    -- Logic to compute max_consecutive_fails would go here
    0 AS max_consecutive_fails,
    0 AS open_instructivos,
    'multiple_failed_exams' AS reason
  FROM mgmt.exam_completed_exams_v
  WHERE exam_date >= (current_date - interval '180 days')
  GROUP BY student_id, full_name
  HAVING COUNT(*) FILTER (WHERE NOT is_passed) >= 2
)
SELECT * FROM student_metrics
ORDER BY max_consecutive_fails DESC,
         failed_exam_count DESC,
         min_score_180d ASC,
         full_name
LIMIT 20;

-- ----------------------------------------------------------------------------
-- 9. Upcoming Exams Count (30d)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW mgmt.exam_upcoming_30d_v AS
SELECT
  COUNT(*) AS upcoming_exams_30d
FROM exams
WHERE status IN ('scheduled', 'confirmed')
  AND time_scheduled BETWEEN NOW() AND NOW() + interval '30 days';

-- ----------------------------------------------------------------------------
-- 10. Upcoming Exams List (30d)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW mgmt.exam_upcoming_30d_list_v AS
SELECT
  e.student_id,
  s.full_name,
  e.time_scheduled AT TIME ZONE 'UTC' AS time_scheduled,
  e.time_scheduled AT TIME ZONE 'America/Guayaquil' AS time_scheduled_local,
  (e.time_scheduled AT TIME ZONE 'America/Guayaquil')::date AS exam_date,
  e.exam_type,
  e.level,
  e.status
FROM exams e
JOIN students s ON e.student_id = s.student_id
WHERE e.status IN ('scheduled', 'confirmed')
  AND e.time_scheduled BETWEEN NOW() AND NOW() + interval '30 days'
ORDER BY e.time_scheduled;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Adjust column names and joins to match your actual schema
-- 2. Time windows are enforced in the views (90d, 180d, 30d)
-- 3. Timezone conversion to America/Guayaquil is critical
-- 4. The exam_completed_exams_v is the foundational view used by many others
-- 5. Add indexes on (exam_date, student_id, exam_type, level) for performance
