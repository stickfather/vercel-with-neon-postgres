import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin-placeholder";

export const metadata: Metadata = {
  title: "Help · Inglés Rápido Manta",
};

export default function AyudaPage() {
  return (
    <AdminPlaceholder
      title="Help center"
      description="Encuentra guías, preguntas frecuentes y contactos para soporte inmediato. Este módulo concentrará tutoriales y material para entrenar a nuevos miembros."
      actions={[
        { href: "/administracion", label: "Volver al panel" },
        { href: "/administracion/configuracion", label: "Abrir configuración", variant: "primary" },
      ]}
    />
  );
}
