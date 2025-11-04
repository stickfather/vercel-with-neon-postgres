import { NextResponse } from "next/server";
import { searchStudents } from "@/features/student-checkin/data/queries";
import { getActiveAttendances } from "@/features/student-checkin/data/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Get all active students, matching the shape and order used in the UI
    const students = await searchStudents("", 1000);
    
    // Get currently checked-in students
    const activeAttendances = await getActiveAttendances();
    
    // Create a map of student IDs to their attendance info
    const attendanceMap = new Map(
      activeAttendances.map((att) => [
        att.id,
        {
          checkInTime: att.checkInTime,
          currentLesson: att.lesson,
          isCheckedIn: true,
        },
      ])
    );
    
    // Enhance student data with attendance info
    const enhancedStudents = students.map((student) => {
      const attendance = attendanceMap.get(student.id);
      return {
        id: student.id,
        fullName: student.fullName,
        lastCheckIn: attendance?.checkInTime ?? null,
        currentLesson: attendance?.currentLesson ?? null,
        isCheckedIn: attendance?.isCheckedIn ?? false,
      };
    });
    
    return NextResponse.json({ 
      students: enhancedStudents,
      version: 2, // Updated version
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching students cache snapshot", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo obtener la lista de estudiantes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
