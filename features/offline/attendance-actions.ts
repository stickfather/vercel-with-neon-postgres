"use client";

import { attemptSync, queueAttendanceEvent } from "@/lib/offline/attendance-sync";

function nowIso(): string {
  return new Date().toISOString();
}

export async function queueStudentCheckInEvent({
  studentId,
  lessonId,
  confirmOverride = false,
  autoCheckout = false,
}: {
  studentId: number;
  lessonId: number;
  confirmOverride?: boolean;
  autoCheckout?: boolean;
}): Promise<void> {
  await queueAttendanceEvent("student_checkin", {
    student_id: studentId,
    lesson_id: lessonId,
    checkin_time: nowIso(),
    confirm_override: confirmOverride,
    auto_checkout: autoCheckout,
  });
  await attemptSync();
}

export async function queueStudentCheckoutEvent({
  studentId,
  attendanceId,
  autoCheckout = false,
}: {
  studentId: number;
  attendanceId: number;
  autoCheckout?: boolean;
}): Promise<void> {
  await queueAttendanceEvent("student_checkout", {
    student_id: studentId,
    attendance_id: attendanceId,
    checkout_time: nowIso(),
    auto_checkout: autoCheckout,
  });
  await attemptSync();
}

export async function queueStaffCheckInEvent({
  staffId,
  autoCheckout = false,
}: {
  staffId: number;
  autoCheckout?: boolean;
}): Promise<void> {
  await queueAttendanceEvent("staff_checkin", {
    staff_id: staffId,
    checkin_time: nowIso(),
    auto_checkout: autoCheckout,
  });
  await attemptSync();
}

export async function queueStaffCheckoutEvent({
  staffId,
  autoCheckout = false,
}: {
  staffId: number;
  autoCheckout?: boolean;
}): Promise<void> {
  await queueAttendanceEvent("staff_checkout", {
    staff_id: staffId,
    checkout_time: nowIso(),
    auto_checkout: autoCheckout,
  });
  await attemptSync();
}
