import type { ReactNode } from "react";

import { hasValidPinSession, type PinScope } from "@/lib/security/pin-session";
import { isSecurityPinEnabled } from "@/features/security/data/pins";
import { PinGateOverlay } from "@/features/security/components/PinGateOverlay";

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

  const initiallyAllowed =
    scope === "manager" ? await hasValidPinSession(scope) : false;

  return (
    <>
      {children}
      <PinGateOverlay
        scope={scope}
        title={title}
        description={description}
        ctaLabel={ctaLabel}
        initiallyAllowed={initiallyAllowed}
      />
    </>
  );
}
