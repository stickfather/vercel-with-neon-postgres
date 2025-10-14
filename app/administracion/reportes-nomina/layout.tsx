import type { ReactNode } from "react";

import { PinGate } from "@/features/security/components/PinGate";

type LayoutProps = {
  children: ReactNode;
};

export default function ReportesNominaLayout({ children }: LayoutProps) {
  return (
    <PinGate
      scope="manager"
      title="PIN de gerencia requerido"
      description="Para aprobar o editar nómina, confirma el PIN de gerencia."
      ctaLabel="Desbloquear nómina"
    >
      {children}
    </PinGate>
  );
}
