import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin-placeholder";

export const metadata: Metadata = {
  title: "Student management · Inglés Rápido Manta",
};

export default function GestionEstudiantesPage() {
  return (
    <AdminPlaceholder
      title="Student management"
      description="Mantén actualizados los perfiles, niveles, asistencias y seguimientos de cada estudiante. Esta vista concentrará todas las acciones académicas."
      actions={[
        { href: "/administracion", label: "Volver al panel" },
        { href: "/registro", label: "Abrir registro de asistencia", variant: "primary" },
      ]}
    />
  );
}
