import type { ReactNode } from "react";

import { PinGate } from "@/features/security/components/PinGate";

type LayoutProps = {
  children: ReactNode;
};

export default function AdministracionLayout({ children }: LayoutProps) {
  return (
    <PinGate
      scope="staff"
      title="Introduce el PIN del personal"
      description="Solo el equipo autorizado puede acceder a Administración. Ingresa el PIN del personal para continuar."
      ctaLabel="Acceder"
    >
      {children}
    </PinGate>
  );
}
