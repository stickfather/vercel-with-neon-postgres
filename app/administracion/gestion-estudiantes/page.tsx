import type { Metadata } from "next";
import { AdminPlaceholder } from "@/features/administration/components/admin-placeholder";

export const metadata: Metadata = {
  title: "Gestión de estudiantes · Inglés Rápido Manta",
};

export default function GestionEstudiantesPage() {
  return (
    <AdminPlaceholder
      title="Gestión de estudiantes"
      description="Mantén actualizados los perfiles, niveles, asistencias y seguimientos de cada estudiante. Esta vista concentrará todas las acciones académicas."
      actions={[
        { href: "/administracion", label: "Volver al panel" },
        { href: "/registro", label: "Abrir registro de asistencia", variant: "primary" },
      ]}
    />
  );
}
