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
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#fef5ee] via-white to-[#e9f9f4] px-6 py-16">
      <PinPrompt
        scope={scope}
        title={title}
        description={description}
        ctaLabel={ctaLabel}
      />
    </div>
  );
}
