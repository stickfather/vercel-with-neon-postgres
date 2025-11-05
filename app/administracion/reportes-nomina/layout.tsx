"use client";

import type { ReactNode } from "react";
import { ClientPinGate } from "@/features/security/components/ClientPinGate";

type LayoutProps = {
  children: ReactNode;
};

export default function ReportesNominaLayout({ children }: LayoutProps) {
  return (
    <ClientPinGate
      scope="manager"
      title="PIN de gerencia requerido"
      description="Solo gerentes pueden acceder a los reportes de nómina."
      ctaLabel="Validar PIN"
    >
      {children}
    </ClientPinGate>
  );
}
