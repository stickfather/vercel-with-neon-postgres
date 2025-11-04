"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { PinScope } from "@/lib/security/pin-session";
import { PinPrompt } from "@/features/security/components/PinPrompt";
import { hasValidOfflinePinToken, hasCachedPinHash } from "@/lib/security/offline-pin";

type ClientPinGateProps = {
  scope: PinScope;
  title: string;
  description: string;
  ctaLabel?: string;
  children: ReactNode;
};

export function ClientPinGate({
  scope,
  title,
  description,
  ctaLabel,
  children,
}: ClientPinGateProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuthorization = async () => {
      setIsChecking(true);
      
      const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;
      
      if (!isOnline) {
        // When offline, check for offline token (recent successful auth)
        const hasToken = hasValidOfflinePinToken(scope);
        setIsAuthorized(hasToken);
        setIsChecking(false);
        return;
      }

      // When online, check server session
      try {
        const response = await fetch("/api/security/session-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope }),
        });

        if (response.ok) {
          const data = (await response.json()) as { authorized?: boolean };
          setIsAuthorized(data.authorized ?? false);
        } else {
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error("Failed to check PIN session", error);
        // On error, check offline token as fallback
        const hasToken = hasValidOfflinePinToken(scope);
        setIsAuthorized(hasToken);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuthorization();
  }, [scope]);

  const handleSuccess = () => {
    setIsAuthorized(true);
  };

  if (isChecking) {
    return (
      <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-slate-900/30 px-4 py-10 backdrop-blur-sm">
        <div className="rounded-[28px] border border-white/70 bg-white/95 px-8 py-9 shadow-[0_26px_60px_rgba(15,23,42,0.18)]">
          <p className="text-sm text-brand-ink-muted">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-slate-900/30 px-4 py-10 backdrop-blur-sm">
        <PinPrompt
          scope={scope}
          title={title}
          description={description}
          ctaLabel={ctaLabel}
          onSuccess={handleSuccess}
        />
      </div>
    );
  }

  return <>{children}</>;
}
