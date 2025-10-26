"use client";

import { useState } from "react";
import type { ReactNode } from "react";

import PinPrompt from "@/components/PinPrompt";

type LayoutProps = {
  children: ReactNode;
};

export default function ConfiguracionLayout({ children }: LayoutProps) {
  const [unlocked, setUnlocked] = useState(false);

  return (
    <>
      {!unlocked && (
        <PinPrompt
          role="manager"
          title="Introduce el PIN de gerencia para acceder a la configuración"
          submitLabel="Desbloquear"
          onSuccess={() => setUnlocked(true)}
        />
      )}
      {unlocked ? children : null}
    </>
  );
}
