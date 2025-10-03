import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin-placeholder";

export const metadata: Metadata = {
  title: "Calendario · Inglés Rápido Manta",
};

export default function CalendarioPage() {
  return (
    <AdminPlaceholder
      title="Calendario del centro"
      description="Organiza clases especiales, evaluaciones externas y actividades culturales. Próximamente podrás sincronizar este calendario con tus herramientas favoritas."
      actions={[
        { href: "/administracion", label: "Volver al panel" },
        { href: "/", label: "Ir a la bienvenida", variant: "primary" },
      ]}
    />
  );
}
