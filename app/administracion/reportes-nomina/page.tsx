import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin-placeholder";

export const metadata: Metadata = {
  title: "Reportes de nómina · Inglés Rápido Manta",
};

export default function ReportesNominaPage() {
  return (
    <AdminPlaceholder
      title="Reportes de nómina"
      description="Centraliza la información salarial, control de horas y bonificaciones del equipo. Pronto podrás generar reportes listos para contabilidad."
      actions={[
        { href: "/administracion", label: "Volver al panel" },
        { href: "/administracion/registro-personal", label: "Ver registro del personal", variant: "primary" },
      ]}
    />
  );
}
