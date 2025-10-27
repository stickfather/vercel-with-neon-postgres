import type { ReactNode } from "react";

import { PinGate } from "@/features/security/components/PinGate";

type Props = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: Props) {
  return (
    <PinGate
      scope="staff"
      title="Introduce tu PIN del personal"
      description="Necesitamos confirmar tu acceso antes de entrar a los reportes gerenciales."
      ctaLabel="Desbloquear"
    >
      {children}
    </PinGate>
  );
}
