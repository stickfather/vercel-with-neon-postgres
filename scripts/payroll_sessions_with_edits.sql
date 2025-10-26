-- Payroll session views and edit functions for SALC payroll matrix.
-- Run with: psql $DATABASE_URL -f scripts/payroll_sessions_with_edits.sql

BEGIN;

-- Attendance localized view
CREATE OR REPLACE VIEW public.attendance_local_base_v AS
WITH localized AS (
  SELECT
    sa.id AS session_id,
    sa.staff_id,
    timezone('America/Guayaquil', sa.checkin_time) AS checkin_local,
    timezone('America/Guayaquil', sa.checkout_time) AS checkout_local,
    timezone('America/Guayaquil', sa.checkin_time)::date AS work_date_local,
    GREATEST(
      0,
      floor(
        EXTRACT(epoch FROM COALESCE(sa.checkout_time, sa.checkin_time) - sa.checkin_time) / 60.0
      )::integer
    ) AS session_minutes
  FROM public.staff_attendance sa
)
SELECT
  session_id,
  staff_id,
  work_date_local,
  checkin_local,
  checkout_local,
  session_minutes,
  round(session_minutes::numeric / 60.0, 2) AS session_hours
FROM localized;

-- Session rows for UI
CREATE OR REPLACE VIEW public.staff_day_sessions_local_v AS
SELECT
  session_id,
  staff_id,
  work_date_local AS work_date,
  checkin_local,
  checkout_local,
  session_minutes,
  session_hours AS total_hours
FROM public.attendance_local_base_v
ORDER BY staff_id, work_date_local, checkin_local;

-- Session rows with edit metadata
CREATE OR REPLACE VIEW public.staff_day_sessions_with_edits_v AS
SELECT
  s.session_id,
  s.staff_id,
  s.checkin_local,
  s.checkout_local,
  s.session_minutes,
  s.total_hours,
  s.work_date,
  (ae.details -> 'before' ->> 'checkinTime') AS original_checkin_local,
  (ae.details -> 'before' ->> 'checkoutTime') AS original_checkout_local,
  (ae.details -> 'after' ->> 'checkinTime') AS edited_checkin_local,
  (ae.details -> 'after' ->> 'checkoutTime') AS edited_checkout_local,
  (ae.details ->> 'editedByStaffId') AS edited_by_staff_id,
  (ae.details ->> 'note') AS edit_note,
  (ae.id IS NOT NULL) AS was_edited
FROM public.staff_day_sessions_local_v s
LEFT JOIN LATERAL (
  SELECT
    ae_1.id,
    ae_1.details
  FROM public.payroll_audit_events ae_1
  WHERE ae_1.session_id = s.session_id
    AND ae_1.action = 'update_session'
  ORDER BY ae_1.created_at DESC
  LIMIT 1
) ae ON TRUE;

-- Edited day lookup for matrix highlighting
CREATE OR REPLACE VIEW public.staff_day_has_edits_v AS
SELECT
  ae.staff_id,
  ae.work_date,
  TRUE AS has_edits
FROM public.payroll_audit_events ae
WHERE ae.action IN ('update_session', 'add_session', 'delete_session')
GROUP BY ae.staff_id, ae.work_date;

-- Day totals helper view
CREATE OR REPLACE VIEW public.staff_day_totals_v AS
SELECT
  staff_id,
  work_date_local AS work_date,
  SUM(session_minutes)::integer AS total_minutes,
  ROUND(SUM(session_minutes)::numeric / 60.0, 2) AS total_hours
FROM public.attendance_local_base_v
GROUP BY staff_id, work_date_local;

-- Payroll day matrix view
CREATE OR REPLACE VIEW public.staff_day_matrix_local_v AS
WITH session_totals AS (
  SELECT
    s.staff_id,
    s.work_date,
    SUM(COALESCE(s.session_minutes, 0))::integer AS total_minutes
  FROM public.staff_day_sessions_local_v s
  GROUP BY s.staff_id, s.work_date
),
approvals AS (
  SELECT
    a.staff_id,
    a.work_date,
    a.approved_minutes,
    a.approved
  FROM public.payroll_day_approvals a
)
SELECT
  COALESCE(st.staff_id, ap.staff_id) AS staff_id,
  COALESCE(st.work_date, ap.work_date) AS work_date,
  ROUND(COALESCE(st.total_minutes, 0)::numeric / 60.0, 2) AS total_hours,
  CASE
    WHEN ap.approved_minutes IS NULL THEN NULL::numeric
    ELSE ROUND(ap.approved_minutes::numeric / 60.0, 2)
  END AS approved_hours,
  NULL::numeric AS horas_mostrar,
  ap.approved
FROM session_totals st
FULL JOIN approvals ap
  ON ap.staff_id = st.staff_id
 AND ap.work_date = st.work_date
WHERE COALESCE(st.staff_id, ap.staff_id) IS NOT NULL
ORDER BY COALESCE(st.staff_id, ap.staff_id),
  COALESCE(st.work_date, ap.work_date);

-- Helper to interpret local timestamps
CREATE OR REPLACE FUNCTION public.to_ec_timestamptz(ts_local TEXT)
RETURNS TIMESTAMPTZ LANGUAGE sql AS $$
SELECT (ts_local || ' America/Guayaquil')::timestamptz;
$$;

-- Edit session function
CREATE OR REPLACE FUNCTION public.edit_staff_session(
  p_session_id BIGINT,
  p_editor_staff_id BIGINT,
  p_new_checkin_local TEXT,
  p_new_checkout_local TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS TABLE (
  session_id BIGINT,
  staff_id BIGINT,
  work_date DATE,
  checkin_local TIMESTAMP WITHOUT TIME ZONE,
  checkout_local TIMESTAMP WITHOUT TIME ZONE,
  session_minutes INTEGER,
  session_hours NUMERIC
)
LANGUAGE plpgsql AS $$
DECLARE
  v_old public.staff_attendance%ROWTYPE;
  v_new_checkin timestamptz;
  v_new_checkout timestamptz;
  v_work_date DATE;
  v_total_minutes INTEGER;
BEGIN
  SELECT * INTO v_old
  FROM public.staff_attendance
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session % not found', p_session_id;
  END IF;

  v_new_checkin := public.to_ec_timestamptz(p_new_checkin_local);
  v_new_checkout := public.to_ec_timestamptz(p_new_checkout_local);

  v_work_date := timezone('America/Guayaquil', v_new_checkin)::date;

  INSERT INTO public.payroll_audit_events (
    action,
    staff_id,
    work_date,
    session_id,
    details
  )
  VALUES (
    'update_session',
    v_old.staff_id,
    v_work_date,
    v_old.id,
    jsonb_build_object(
      'before', jsonb_build_object(
        'checkinTime', timezone('America/Guayaquil', v_old.checkin_time),
        'checkoutTime', timezone('America/Guayaquil', v_old.checkout_time)
      ),
      'after', jsonb_build_object(
        'checkinTime', timezone('America/Guayaquil', v_new_checkin),
        'checkoutTime', timezone('America/Guayaquil', v_new_checkout)
      ),
      'editedByStaffId', p_editor_staff_id,
      'note', p_note
    )
  );

  UPDATE public.staff_attendance
  SET
    checkin_time = v_new_checkin,
    checkout_time = v_new_checkout
  WHERE id = p_session_id;

  SELECT COALESCE(SUM(session_minutes), 0)::integer
  INTO v_total_minutes
  FROM public.attendance_local_base_v
  WHERE staff_id = v_old.staff_id
    AND work_date_local = v_work_date;

  INSERT INTO public.payroll_day_approvals (
    staff_id,
    work_date,
    approved,
    approved_minutes,
    approved_at,
    approved_by_staff_id
  )
  VALUES (
    v_old.staff_id,
    v_work_date,
    TRUE,
    v_total_minutes,
    NOW(),
    p_editor_staff_id
  )
  ON CONFLICT (staff_id, work_date) DO UPDATE
  SET
    approved = TRUE,
    approved_minutes = EXCLUDED.approved_minutes,
    approved_at = NOW(),
    approved_by_staff_id = COALESCE(EXCLUDED.approved_by_staff_id, public.payroll_day_approvals.approved_by_staff_id);

  RETURN QUERY
  SELECT
    a.session_id,
    a.staff_id,
    a.work_date_local AS work_date,
    a.checkin_local,
    a.checkout_local,
    a.session_minutes,
    a.session_hours
  FROM public.attendance_local_base_v a
  WHERE a.session_id = p_session_id;
END;
$$;

-- Add session helper
CREATE OR REPLACE FUNCTION public.add_staff_session(
  p_staff_id BIGINT,
  p_checkin_local TEXT,
  p_checkout_local TEXT,
  p_editor_staff_id BIGINT,
  p_note TEXT DEFAULT NULL
)
RETURNS TABLE (
  session_id BIGINT,
  staff_id BIGINT,
  work_date DATE,
  checkin_local TIMESTAMP WITHOUT TIME ZONE,
  checkout_local TIMESTAMP WITHOUT TIME ZONE,
  session_minutes INTEGER,
  session_hours NUMERIC
)
LANGUAGE plpgsql AS $$
DECLARE
  v_checkin timestamptz;
  v_checkout timestamptz;
  v_session_id BIGINT;
  v_work_date DATE;
  v_total_minutes INTEGER;
BEGIN
  v_checkin := public.to_ec_timestamptz(p_checkin_local);
  v_checkout := public.to_ec_timestamptz(p_checkout_local);

  IF v_checkout <= v_checkin THEN
    RAISE EXCEPTION 'Checkout must be after checkin';
  END IF;

  v_work_date := timezone('America/Guayaquil', v_checkin)::date;

  INSERT INTO public.staff_attendance (staff_id, checkin_time, checkout_time)
  VALUES (p_staff_id, v_checkin, v_checkout)
  RETURNING id INTO v_session_id;

  INSERT INTO public.payroll_audit_events (
    action,
    staff_id,
    work_date,
    session_id,
    details
  )
  VALUES (
    'add_session',
    p_staff_id,
    v_work_date,
    v_session_id,
    jsonb_build_object(
      'after', jsonb_build_object(
        'checkinTime', timezone('America/Guayaquil', v_checkin),
        'checkoutTime', timezone('America/Guayaquil', v_checkout)
      ),
      'editedByStaffId', p_editor_staff_id,
      'note', p_note
    )
  );

  SELECT COALESCE(SUM(session_minutes), 0)::integer
  INTO v_total_minutes
  FROM public.attendance_local_base_v
  WHERE staff_id = p_staff_id
    AND work_date_local = v_work_date;

  INSERT INTO public.payroll_day_approvals (
    staff_id,
    work_date,
    approved,
    approved_minutes,
    approved_at,
    approved_by_staff_id
  )
  VALUES (
    p_staff_id,
    v_work_date,
    TRUE,
    v_total_minutes,
    NOW(),
    p_editor_staff_id
  )
  ON CONFLICT (staff_id, work_date) DO UPDATE
  SET
    approved = TRUE,
    approved_minutes = EXCLUDED.approved_minutes,
    approved_at = NOW(),
    approved_by_staff_id = COALESCE(EXCLUDED.approved_by_staff_id, public.payroll_day_approvals.approved_by_staff_id);

  RETURN QUERY
  SELECT
    a.session_id,
    a.staff_id,
    a.work_date_local AS work_date,
    a.checkin_local,
    a.checkout_local,
    a.session_minutes,
    a.session_hours
  FROM public.attendance_local_base_v a
  WHERE a.session_id = v_session_id;
END;
$$;

-- Delete session helper
CREATE OR REPLACE FUNCTION public.delete_staff_session(
  p_session_id BIGINT,
  p_editor_staff_id BIGINT,
  p_note TEXT DEFAULT NULL
)
RETURNS TABLE (
  staff_id BIGINT,
  work_date DATE,
  remaining_minutes INTEGER,
  remaining_hours NUMERIC
)
LANGUAGE plpgsql AS $$
DECLARE
  v_old public.staff_attendance%ROWTYPE;
  v_work_date DATE;
  v_remaining_minutes INTEGER;
BEGIN
  SELECT * INTO v_old
  FROM public.staff_attendance
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session % not found', p_session_id;
  END IF;

  v_work_date := timezone('America/Guayaquil', v_old.checkin_time)::date;

  DELETE FROM public.staff_attendance
  WHERE id = p_session_id;

  INSERT INTO public.payroll_audit_events (
    action,
    staff_id,
    work_date,
    session_id,
    details
  )
  VALUES (
    'delete_session',
    v_old.staff_id,
    v_work_date,
    p_session_id,
    jsonb_build_object(
      'before', jsonb_build_object(
        'checkinTime', timezone('America/Guayaquil', v_old.checkin_time),
        'checkoutTime', timezone('America/Guayaquil', v_old.checkout_time)
      ),
      'editedByStaffId', p_editor_staff_id,
      'note', p_note
    )
  );

  SELECT COALESCE(SUM(session_minutes), 0)::integer
  INTO v_remaining_minutes
  FROM public.attendance_local_base_v
  WHERE staff_id = v_old.staff_id
    AND work_date_local = v_work_date;

  INSERT INTO public.payroll_day_approvals (
    staff_id,
    work_date,
    approved,
    approved_minutes,
    approved_at,
    approved_by_staff_id
  )
  VALUES (
    v_old.staff_id,
    v_work_date,
    TRUE,
    v_remaining_minutes,
    NOW(),
    p_editor_staff_id
  )
  ON CONFLICT (staff_id, work_date) DO UPDATE
  SET
    approved = TRUE,
    approved_minutes = EXCLUDED.approved_minutes,
    approved_at = NOW(),
    approved_by_staff_id = COALESCE(EXCLUDED.approved_by_staff_id, public.payroll_day_approvals.approved_by_staff_id);

  RETURN QUERY
  SELECT
    v_old.staff_id,
    v_work_date,
    v_remaining_minutes,
    ROUND(v_remaining_minutes::numeric / 60.0, 2)
  ;
END;
$$;

COMMIT;
