"use client";

import { useEffect, useState } from "react";
import type {
  ActiveAttendance,
  LevelLessons,
} from "@/features/student-checkin/data/queries";
import { StudentRegistroPageShell } from "@/features/student-checkin/components/registro-page-shell";

export default function RegistroPage() {
  const [levels, setLevels] = useState<LevelLessons[]>([]);
  const [attendances, setAttendances] = useState<ActiveAttendance[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [lessonsError, setLessonsError] = useState<string | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;

      // Fetch levels (lessons)
      try {
        const levelsResponse = await fetch("/api/levels-with-lessons");
        if (levelsResponse.ok) {
          const data = (await levelsResponse.json()) as { levels?: LevelLessons[] };
          if (data.levels && data.levels.length > 0) {
            setLevels(data.levels);
          } else {
            setLessonsError(
              "Aún no hay lecciones disponibles para seleccionar. Nuestro equipo lo resolverá en breve."
            );
          }
        } else {
          throw new Error("Failed to fetch levels");
        }
      } catch (error) {
        console.error("No se pudieron cargar los niveles y lecciones disponibles", error);
        if (!isOnline) {
          setFormError(
            "Sin conexión. Las lecciones solo están disponibles en línea por ahora."
          );
          setLessonsError(
            "Sin conexión. Las lecciones solo están disponibles en línea."
          );
        } else {
          setFormError(
            "No pudimos cargar la lista de niveles. Contacta a un asesor para registrar tu asistencia."
          );
          setLessonsError(
            "No pudimos cargar la lista de niveles y lecciones. Nuestro equipo ya está trabajando en ello."
          );
        }
      }

      // Fetch active attendances
      try {
        const attendancesResponse = await fetch("/api/attendances");
        if (attendancesResponse.ok) {
          const data = (await attendancesResponse.json()) as { attendances?: ActiveAttendance[] };
          if (data.attendances) {
            setAttendances(data.attendances);
          }
        } else {
          throw new Error("Failed to fetch attendances");
        }
      } catch (error) {
        console.error("No se pudieron cargar las asistencias activas", error);
        
        // Try to load from cache when offline
        if (!isOnline) {
          try {
            const { getStudentsCache } = await import("@/lib/offline/indexeddb");
            const cached = await getStudentsCache();
            
            // Convert cached students to active attendances format
            const cachedAttendances: ActiveAttendance[] = cached
              .filter((s) => s.isCheckedIn)
              .map((s) => ({
                id: s.id,
                fullName: s.fullName,
                lesson: s.currentLesson ?? null,
                level: null,
                lessonSequence: null,
                lessonGlobalSequence: null,
                checkInTime: s.lastCheckIn ?? "",
              }));
            
            if (cachedAttendances.length > 0) {
              setAttendances(cachedAttendances);
            } else {
              setAttendanceError(
                "Sin conexión. No hay datos de asistencia guardados."
              );
            }
          } catch (cacheError) {
            console.error("Failed to load from cache", cacheError);
            setAttendanceError(
              "Sin conexión. No hay datos de asistencia guardados."
            );
          }
        } else {
          setAttendanceError(
            "No pudimos cargar la lista de estudiantes en clase. Consulta el panel principal."
          );
        }
      }

      setIsLoading(false);
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-orange border-t-transparent"></div>
          <p className="text-sm text-brand-ink-muted">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <StudentRegistroPageShell
      attendances={attendances}
      attendanceError={attendanceError}
      formError={formError}
      lessonsError={lessonsError}
    />
  );
}
