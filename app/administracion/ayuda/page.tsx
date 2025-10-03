import type { Metadata } from "next";
import { AdminPlaceholder } from "@/features/administration/components/admin-placeholder";

export const metadata: Metadata = {
  title: "Centro de ayuda · Inglés Rápido Manta",
};

export default function AyudaPage() {
  return (
    <AdminPlaceholder
      title="Centro de ayuda"
      description="Encuentra guías, preguntas frecuentes y contactos para soporte inmediato. Este módulo concentrará tutoriales y material para entrenar a nuevos miembros."
      actions={[
        { href: "/administracion", label: "Volver al panel" },
        { href: "/administracion/configuracion", label: "Abrir configuración", variant: "primary" },
      ]}
    />
  );
}
