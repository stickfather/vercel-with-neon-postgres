-- Student lesson journey views
-- These views provide the residency window for each lesson and the
-- aggregated engagement minutes per lesson.

CREATE OR REPLACE VIEW mart.student_lesson_timeline_v AS
WITH first_last AS (
  SELECT
    sa.student_id,
    sa.lesson_id,
    MIN(sa.checkin_time) AS first_seen_at,
    MAX(sa.checkin_time) AS last_seen_at
  FROM student_attendance sa
  GROUP BY sa.student_id, sa.lesson_id
),
lesson_order AS (
  SELECT id AS lesson_id, seq AS lesson_seq FROM lessons
),
next_lesson AS (
  SELECT
    fl.student_id,
    fl.lesson_id,
    MIN(lo2.lesson_seq) AS next_seq_after_this
  FROM first_last fl
  JOIN lesson_order lo1 ON lo1.lesson_id = fl.lesson_id
  LEFT JOIN student_attendance sa2 ON sa2.student_id = fl.student_id
  LEFT JOIN lesson_order lo2
    ON lo2.lesson_id = sa2.lesson_id AND lo2.lesson_seq > lo1.lesson_seq
  GROUP BY fl.student_id, fl.lesson_id
)
SELECT
  fl.student_id,
  fl.lesson_id,
  fl.first_seen_at AS start_at,
  COALESCE((
    SELECT MIN(sa3.checkin_time)
    FROM student_attendance sa3
    JOIN lesson_order lo3 ON lo3.lesson_id = sa3.lesson_id
    WHERE sa3.student_id = fl.student_id
      AND lo3.lesson_seq = nl.next_seq_after_this
  ), NOW()) AS end_at
FROM first_last fl
JOIN next_lesson nl
  ON nl.student_id = fl.student_id
 AND nl.lesson_id = fl.lesson_id;

CREATE OR REPLACE VIEW mart.student_lesson_engagement_v AS
WITH minutes_per_lesson AS (
  SELECT
    sa.student_id,
    sa.lesson_id,
    SUM(EXTRACT(EPOCH FROM (COALESCE(sa.checkout_time, sa.checkin_time) - sa.checkin_time)) / 60.0) AS total_minutes_in_lesson
  FROM student_attendance sa
  GROUP BY sa.student_id, sa.lesson_id
)
SELECT
  t.student_id,
  t.lesson_id,
  t.start_at,
  t.end_at,
  COALESCE(m.total_minutes_in_lesson, 0) AS total_minutes_in_lesson
FROM mart.student_lesson_timeline_v t
LEFT JOIN minutes_per_lesson m
  ON m.student_id = t.student_id AND m.lesson_id = t.lesson_id;
