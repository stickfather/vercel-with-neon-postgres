import type { ReactNode } from "react";

import { hasValidPinSession, type PinScope } from "@/lib/security/pin-session";
import { isSecurityPinEnabled } from "@/features/security/data/pins";
import { PinPrompt } from "@/features/security/components/PinPrompt";

type PinGateProps = {
  scope: PinScope;
  title: string;
  description: string;
  ctaLabel?: string;
  children: ReactNode;
};

export async function PinGate({
  scope,
  title,
  description,
  ctaLabel,
  children,
}: PinGateProps) {
  const pinEnabled = await isSecurityPinEnabled(scope);
  if (!pinEnabled) {
    return <>{children}</>;
  }

  const allowed = await hasValidPinSession(scope);

  if (allowed) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-slate-900/30 px-4 py-10 backdrop-blur-sm">
      <PinPrompt
        scope={scope}
        title={title}
        description={description}
        ctaLabel={ctaLabel}
      />
    </div>
  );
}
