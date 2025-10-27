import {
  getActiveStaffAttendances,
  getStaffDirectory,
} from "@/features/staff/data/queries";
import { StaffRegistroPageShell } from "@/features/staff/components/registro-page-shell";

export const revalidate = 0;

export default async function RegistroPersonalPage() {
  let staffMembers = [] as Awaited<ReturnType<typeof getStaffDirectory>>;
  let attendances = [] as Awaited<ReturnType<typeof getActiveStaffAttendances>>;
  let formError: string | null = null;
  let boardError: string | null = null;

  const [staffResult, attendanceResult] = await Promise.allSettled([
    getStaffDirectory(),
    getActiveStaffAttendances(),
  ]);

  if (staffResult.status === "fulfilled") {
    staffMembers = staffResult.value;
  } else {
    console.error("No se pudo cargar el personal", staffResult.reason);
    formError =
      "No pudimos cargar la lista de personal. Contacta a coordinación para registrar tu asistencia.";
  }

  if (attendanceResult.status === "fulfilled") {
    attendances = attendanceResult.value;
  } else {
    console.error(
      "No se pudieron cargar las asistencias del personal",
      attendanceResult.reason,
    );
    boardError =
      "No pudimos mostrar quién está presente. Verifica manualmente en el panel principal.";
  }

  return (
    <StaffRegistroPageShell
      staffMembers={staffMembers}
      attendances={attendances}
      formError={formError}
      boardError={boardError}
    />
  );
}
