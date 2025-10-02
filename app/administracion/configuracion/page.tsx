import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin-placeholder";

export const metadata: Metadata = {
  title: "Configuración · Inglés Rápido Manta",
};

export default function ConfiguracionPage() {
  return (
    <AdminPlaceholder
      title="Configuración del sistema"
      description="Personaliza horarios, cierres automáticos, plantillas visuales y permisos del equipo. Aquí centralizaremos todos los ajustes operativos."
      actions={[
        { href: "/administracion", label: "Volver al panel" },
        { href: "/administracion/ayuda", label: "Ver ayuda", variant: "primary" },
      ]}
    />
  );
}
