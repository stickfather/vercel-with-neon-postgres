import { NextResponse } from "next/server";

import { deleteStudentAttendanceEntry } from "@/features/administration/data/student-profile";

function parseId(value: string | undefined): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.trunc(parsed);
}

export async function DELETE(request: Request) {
  try {
    const segments = request.url ? new URL(request.url).pathname.split("/").filter(Boolean) : [];
    const studentIndex = segments.lastIndexOf("students");
    const attendanceIndex = segments.lastIndexOf("attendance");
    const studentIdSegment =
      studentIndex >= 0 && studentIndex + 1 < segments.length ? segments[studentIndex + 1] : undefined;
    const attendanceIdSegment =
      attendanceIndex >= 0 && attendanceIndex + 1 < segments.length
        ? segments[attendanceIndex + 1]
        : undefined;

    const studentId = parseId(studentIdSegment ?? undefined);
    const attendanceId = parseId(attendanceIdSegment ?? undefined);

    if (!studentId || !attendanceId) {
      return NextResponse.json(
        { error: "El identificador de estudiante o asistencia no es válido." },
        { status: 400 },
      );
    }

    const result = await deleteStudentAttendanceEntry({ studentId, attendanceId });
    if (!result) {
      return NextResponse.json(
        { error: "No encontramos el registro de asistencia solicitado." },
        { status: 404 },
      );
    }

    return NextResponse.json({ deleted: true, softDeleted: result.softDeleted });
  } catch (error) {
    console.error("No se pudo eliminar la asistencia del estudiante", error);
    const message =
      error instanceof Error ? error.message : "No se pudo eliminar el registro de asistencia indicado.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
