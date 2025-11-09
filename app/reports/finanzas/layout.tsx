import type { ReactNode } from "react";

import { PinGate } from "@/features/security/components/PinGate";

type Props = {
  children: ReactNode;
};

export default async function FinanzasLayout({ children }: Props) {
  return (
    <PinGate
      scope="manager"
      title="PIN gerencial requerido"
      description="Solo dirección tiene acceso a finanzas. Ingresa el PIN para continuar."
      ctaLabel="Validar PIN"
    >
      {children}
    </PinGate>
  );
}
