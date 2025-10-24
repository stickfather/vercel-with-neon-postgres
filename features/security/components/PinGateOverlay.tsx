"use client";

import { useEffect, useState } from "react";

import { PinPrompt } from "@/features/security/components/PinPrompt";
import type { PinScope } from "@/lib/security/pin-session";

type PinGateOverlayProps = {
  scope: PinScope;
  title: string;
  description: string;
  ctaLabel?: string;
  initiallyAllowed?: boolean;
};

export function PinGateOverlay({
  scope,
  title,
  description,
  ctaLabel,
  initiallyAllowed = false,
}: PinGateOverlayProps) {
  const [allowed, setAllowed] = useState(initiallyAllowed);

  useEffect(() => {
    if (initiallyAllowed) {
      setAllowed(true);
    }
  }, [initiallyAllowed]);

  if (allowed) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-slate-900/30 px-4 py-10 backdrop-blur-sm">
      <PinPrompt
        scope={scope}
        title={title}
        description={description}
        ctaLabel={ctaLabel}
        onSuccess={() => setAllowed(true)}
      />
    </div>
  );
}

export default PinGateOverlay;
