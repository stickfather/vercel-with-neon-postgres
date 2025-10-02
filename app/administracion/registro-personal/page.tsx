import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin-placeholder";

export const metadata: Metadata = {
  title: "Registro del personal · Inglés Rápido Manta",
};

export default function RegistroPersonalPage() {
  return (
    <AdminPlaceholder
      title="Registro del personal"
      description="Controla la asistencia y permanencia del equipo docente y administrativo. Aquí podrás revisar quién está en el centro y generar reportes rápidos."
      actions={[
        { href: "/administracion", label: "Volver al panel" },
        { href: "/registro", label: "Ir al registro de estudiantes", variant: "primary" },
      ]}
    />
  );
}
