-- Ensure all attendance timestamps are stored using the local Guayaquil timezone.
SET TIME ZONE 'America/Guayaquil';

CREATE OR REPLACE FUNCTION public.student_checkin(p_student_id BIGINT, p_lesson_id BIGINT)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  v_attendance_id BIGINT;
BEGIN
  INSERT INTO public.student_attendance (
    student_id,
    lesson_id,
    checkin_time
  )
  VALUES (
    p_student_id,
    p_lesson_id,
    (now() AT TIME ZONE 'America/Guayaquil')::timestamptz
  )
  RETURNING id INTO v_attendance_id;

  RETURN v_attendance_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.student_checkout(p_student_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_open_id BIGINT;
BEGIN
  SELECT id INTO v_open_id
  FROM public.student_attendance
  WHERE student_id = p_student_id
    AND checkout_time IS NULL
  ORDER BY checkin_time DESC
  LIMIT 1;

  IF v_open_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.student_attendance
  SET checkout_time = (now() AT TIME ZONE 'America/Guayaquil')::timestamptz
  WHERE id = v_open_id;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_checkin(p_staff_id BIGINT)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  v_attendance_id BIGINT;
BEGIN
  INSERT INTO public.staff_attendance (
    staff_id,
    checkin_time
  )
  VALUES (
    p_staff_id,
    (now() AT TIME ZONE 'America/Guayaquil')::timestamptz
  )
  RETURNING id INTO v_attendance_id;

  RETURN v_attendance_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_checkout(p_staff_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_open_id BIGINT;
BEGIN
  SELECT id INTO v_open_id
  FROM public.staff_attendance
  WHERE staff_id = p_staff_id
    AND checkout_time IS NULL
  ORDER BY checkin_time DESC
  LIMIT 1;

  IF v_open_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.staff_attendance
  SET checkout_time = (now() AT TIME ZONE 'America/Guayaquil')::timestamptz
  WHERE id = v_open_id;

  RETURN TRUE;
END;
$$;
