-- View: public.staff_day_sessions_v
--
-- This view groups staff attendance records by their local work date in America/Guayaquil timezone.
-- It provides a timezone-safe way to aggregate sessions by day, ensuring that sessions near
-- midnight are correctly assigned to the date when they started in local time.
--
-- Key columns:
-- - work_date: The date in America/Guayaquil when the session started (DATE type, no timezone)
-- - checkin_time: Original check-in timestamp (TIMESTAMPTZ)
-- - checkout_time: Original check-out timestamp (TIMESTAMPTZ)
-- - checkin_local: Check-in timestamp converted to local time (TIMESTAMP)
-- - checkout_local: Check-out timestamp converted to local time (TIMESTAMP)
-- - minutes: Duration of the session in minutes (INTEGER)
--
-- The duration is computed using timestamptz math (UTC-safe) while grouping is done
-- by the stable Guayaquil local date derived from checkin_time.

CREATE OR REPLACE VIEW public.staff_day_sessions_v AS
SELECT
  sa.id AS session_id,
  sa.staff_id,
  (sa.checkin_time AT TIME ZONE 'America/Guayaquil')::date AS work_date,
  sa.checkin_time,
  sa.checkout_time,
  (sa.checkin_time AT TIME ZONE 'America/Guayaquil') AS checkin_local,
  (sa.checkout_time AT TIME ZONE 'America/Guayaquil') AS checkout_local,
  GREATEST(
    0,
    FLOOR(
      EXTRACT(EPOCH FROM (COALESCE(sa.checkout_time, sa.checkin_time) - sa.checkin_time)) / 60.0
    )::numeric
  )::integer AS minutes
FROM public.staff_attendance sa
WHERE sa.checkin_time IS NOT NULL;

COMMENT ON VIEW public.staff_day_sessions_v IS 
  'Staff attendance sessions grouped by local work date (America/Guayaquil timezone). '
  'Uses timezone-aware date extraction to ensure sessions are grouped by their local start date.';
