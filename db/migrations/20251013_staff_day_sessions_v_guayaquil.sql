-- Migration: Create/Replace staff_day_sessions_v with Guayaquil timezone grouping
-- Date: 2025-10-13
-- Purpose: Fix timezone handling in payroll reports by computing work_date in America/Guayaquil timezone
--
-- This view provides an authoritative grouping of staff attendance sessions by work date
-- computed in the Guayaquil timezone. This ensures that sessions are correctly bucketed
-- regardless of UTC vs local timezone boundaries.

CREATE OR REPLACE VIEW public.staff_day_sessions_v AS
SELECT
  sa.id AS session_id,
  sa.staff_id,
  (sa.checkin_time AT TIME ZONE 'America/Guayaquil')::date AS work_date,
  sa.checkin_time,
  sa.checkout_time,
  GREATEST(
    0,
    FLOOR(
      EXTRACT(EPOCH FROM (COALESCE(sa.checkout_time, sa.checkin_time) - sa.checkin_time)) / 60.0
    )::numeric
  )::integer AS minutes
FROM public.staff_attendance sa
WHERE sa.checkin_time IS NOT NULL;

COMMENT ON VIEW public.staff_day_sessions_v IS 'Staff attendance sessions grouped by work date in America/Guayaquil timezone';
