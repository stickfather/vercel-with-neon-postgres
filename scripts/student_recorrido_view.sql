DROP VIEW IF EXISTS mart.student_recorrido_v;

CREATE OR REPLACE VIEW mart.student_recorrido_v AS
WITH cur AS (
    -- "Where is the student right now in the global curriculum?"
    SELECT
        p.student_id,
        p.current_global_seq_in_plan
    FROM mart.student_plan_progress_v p
),

max_seq_per_level AS (
    -- Last seq in each CEFR level, used to identify the EXAM lesson.
    SELECT
        l.level,
        MAX(l.seq) AS max_seq_in_level
    FROM public.lessons l
    GROUP BY l.level
),

per_level_progress AS (
    -- For each student+level: the furthest lesson seq in that level
    -- where they've logged any effort at all.
    -- This lets us infer "you effectively completed everything up to here."
    SELECT
        e.student_id,
        e.level,
        MAX(e.seq) AS max_seq_they_touched_in_level
    FROM mart.student_lesson_effort_v e
    GROUP BY e.student_id, e.level
)

SELECT
    e.student_id,
    e.lesson_id,
    e.level,
    e.seq,
    l.lesson                               AS lesson_name,

    -- effort metrics
    e.total_hours                          AS hours_spent,
    e.active_days_for_lesson               AS calendar_days_spent,

    -- special flags for rendering
    (e.seq = 0 AND e.level = 'A1')         AS is_intro_booklet,      -- A1 first lesson
    (e.seq = m.max_seq_in_level)           AS is_exam,               -- last lesson in level

    -- where they are now in the global plan
    (lg.lesson_global_seq = c.current_global_seq_in_plan)
                                            AS is_current_lesson,

    -- are they already "past" this lesson in global sequence?
    (lg.lesson_global_seq < c.current_global_seq_in_plan)
                                            AS is_completed_by_position,

    -- how far they've actually worked in this level
    plp.max_seq_they_touched_in_level,

    -- final completion flag for UI:
    -- A lesson is visually "completed" if:
    -- 1) it's globally behind where they are now, OR
    -- 2) it is at/before the furthest lesson they've touched in THIS level.
    (
        (lg.lesson_global_seq < c.current_global_seq_in_plan)
        OR
        (e.seq <= plp.max_seq_they_touched_in_level)
    ) AS is_completed_visual

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
  ON m.level = e.level
LEFT JOIN per_level_progress plp
  ON plp.student_id = e.student_id
 AND plp.level      = e.level;
