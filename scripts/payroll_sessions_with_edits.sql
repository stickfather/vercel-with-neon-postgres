-- Updates payroll session reporting tables/views so the payroll matrix UI works with edit history.
-- Run this script against your Neon/Postgres database (e.g. `psql $DATABASE_URL -f scripts/payroll_sessions_with_edits.sql`).

BEGIN;

-- 1. Ensure the audit log table exists. The application writes to this table when
--    sessions are created, edited, approved, or deleted. We recreate the schema
--    here so environments that have not yet logged any events still have the table
--    definition in place before the view is built.
CREATE TABLE IF NOT EXISTS public.payroll_audit_events (
  id bigserial PRIMARY KEY,
  action text NOT NULL,
  staff_id bigint NOT NULL,
  work_date date NOT NULL,
  session_id bigint NULL,
  details jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Helpful index for lookups by staff/day/action when building the session view.
CREATE INDEX IF NOT EXISTS payroll_audit_events_staff_day_action_idx
  ON public.payroll_audit_events (staff_id, work_date, action);

-- 2. Build/refresh the session view used by the payroll matrix modal. The view
--    returns both the current sessions and any historical (replaced) entries so
--    the UI can display an audit trail. Current sessions are taken from
--    staff_attendance. Historical rows are reconstructed from the audit log
--    generated when the UI edits a session.
CREATE OR REPLACE VIEW public.staff_day_sessions_with_edits_v AS
WITH timezone_config AS (
  SELECT 'America/Guayaquil'::text AS tz
),
session_updates AS (
  SELECT
    pae.staff_id,
    pae.work_date,
    (pae.details ->> 'replacedSessionId')::bigint AS original_session_id,
    pae.session_id AS replacement_session_id,
    (pae.details -> 'before' ->> 'checkinTime')::timestamptz AS original_checkin_time,
    (pae.details -> 'before' ->> 'checkoutTime')::timestamptz AS original_checkout_time,
    (pae.details -> 'after' ->> 'checkinTime')::timestamptz AS replacement_checkin_time,
    (pae.details -> 'after' ->> 'checkoutTime')::timestamptz AS replacement_checkout_time,
    pae.created_at
  FROM public.payroll_audit_events AS pae
  WHERE pae.action = 'update_session'
),
current_sessions AS (
  SELECT
    sa.id AS session_id,
    sa.staff_id,
    DATE(timezone(tz.tz, sa.checkin_time)) AS work_date,
    timezone(tz.tz, sa.checkin_time) AS checkin_local,
    timezone(tz.tz, sa.checkout_time) AS checkout_local,
    GREATEST(
      EXTRACT(EPOCH FROM COALESCE(sa.checkout_time, sa.checkin_time) - sa.checkin_time) / 60.0,
      0
    )::integer AS session_minutes,
    ROUND(
      GREATEST(
        EXTRACT(EPOCH FROM COALESCE(sa.checkout_time, sa.checkin_time) - sa.checkin_time) / 3600.0,
        0
      )::numeric,
      4
    ) AS total_hours,
    su.original_session_id,
    timezone(tz.tz, su.original_checkin_time) AS original_checkin_local,
    timezone(tz.tz, su.original_checkout_time) AS original_checkout_local
  FROM public.staff_attendance AS sa
  CROSS JOIN timezone_config AS tz
  LEFT JOIN session_updates AS su
    ON su.replacement_session_id = sa.id
)
SELECT
  cs.session_id,
  cs.staff_id,
  cs.work_date,
  cs.checkin_local,
  cs.checkout_local,
  cs.session_minutes,
  cs.total_hours,
  cs.original_checkin_local,
  cs.original_checkout_local,
  cs.original_session_id,
  NULL::bigint AS replacement_session_id,
  FALSE AS is_original_record
FROM current_sessions AS cs

UNION ALL

SELECT
  su.original_session_id AS session_id,
  su.staff_id,
  su.work_date,
  timezone(tz.tz, su.original_checkin_time) AS checkin_local,
  timezone(tz.tz, su.original_checkout_time) AS checkout_local,
  GREATEST(
    EXTRACT(EPOCH FROM COALESCE(su.original_checkout_time, su.original_checkin_time) - su.original_checkin_time) / 60.0,
    0
  )::integer AS session_minutes,
  ROUND(
    GREATEST(
      EXTRACT(EPOCH FROM COALESCE(su.original_checkout_time, su.original_checkin_time) - su.original_checkin_time) / 3600.0,
      0
    )::numeric,
    4
  ) AS total_hours,
  timezone(tz.tz, su.original_checkin_time) AS original_checkin_local,
  timezone(tz.tz, su.original_checkout_time) AS original_checkout_local,
  NULL::bigint AS original_session_id,
  su.replacement_session_id,
  TRUE AS is_original_record
FROM session_updates AS su
CROSS JOIN timezone_config AS tz
WHERE su.original_session_id IS NOT NULL;

COMMIT;
