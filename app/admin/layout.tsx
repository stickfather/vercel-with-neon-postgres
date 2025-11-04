import type { ReactNode } from "react";

import { ClientPinGate } from "@/features/security/components/ClientPinGate";

type Props = {
  children: ReactNode;
};

export default function AdminLayout({ children }: Props) {
  return (
    <ClientPinGate
      scope="staff"
      title="Introduce tu PIN del personal"
      description="Necesitamos confirmar tu acceso antes de entrar a los reportes gerenciales."
      ctaLabel="Desbloquear"
    >
      {children}
    </ClientPinGate>
  );
}
