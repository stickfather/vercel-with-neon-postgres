import {
  getActiveAttendances,
  getLevelsWithLessons,
} from "@/features/student-checkin/data/queries";
import { StudentRegistroPageShell } from "@/features/student-checkin/components/registro-page-shell";

export const revalidate = 0;

export default async function RegistroPage() {
  let levels = [] as Awaited<ReturnType<typeof getLevelsWithLessons>>;
  let attendances = [] as Awaited<ReturnType<typeof getActiveAttendances>>;
  let formError: string | null = null;
  let lessonsError: string | null = null;
  let attendanceError: string | null = null;

  try {
    levels = await getLevelsWithLessons();
    if (!levels.length) {
      lessonsError =
        "Aún no hay lecciones disponibles para seleccionar. Nuestro equipo lo resolverá en breve.";
    }
  } catch (error) {
    console.error(
      "No se pudieron cargar los niveles y lecciones disponibles",
      error,
    );
    formError =
      "No pudimos cargar la lista de niveles. Contacta a un asesor para registrar tu asistencia.";
    lessonsError =
      "No pudimos cargar la lista de niveles y lecciones. Nuestro equipo ya está trabajando en ello.";
  }

  try {
    attendances = await getActiveAttendances();
  } catch (error) {
    console.error("No se pudieron cargar las asistencias activas", error);
    attendanceError =
      "No pudimos cargar la lista de estudiantes en clase. Consulta el panel principal.";
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
