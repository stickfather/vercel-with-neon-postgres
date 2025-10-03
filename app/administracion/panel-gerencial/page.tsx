import type { Metadata } from "next";
import { AdminPlaceholder } from "@/features/administration/components/admin-placeholder";

export const metadata: Metadata = {
  title: "Paneles gerenciales · Inglés Rápido Manta",
};

export default function PanelGerencialPage() {
  return (
    <AdminPlaceholder
      title="Paneles gerenciales"
      description="Reúne indicadores de avance, ocupación y satisfacción para la dirección del centro. Muy pronto podrás visualizar KPIs en tiempo real."
      actions={[
        { href: "/administracion", label: "Volver al panel" },
        { href: "/administracion/reportes-nomina", label: "Revisar nómina", variant: "primary" },
      ]}
    />
  );
}
