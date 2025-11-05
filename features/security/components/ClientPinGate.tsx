"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import type { PinScope } from "@/lib/security/pin-session";
import { PinPrompt } from "@/features/security/components/PinPrompt";

type ClientPinGateProps = {
  scope: PinScope;
  title: string;
  description: string;
  ctaLabel?: string;
  children: ReactNode;
};

function hasLocalSession(scope: PinScope): boolean {
  if (typeof window === "undefined") return false;
  
  try {
    const sessionKey = `pin-session-${scope}`;
    const sessionData = window.localStorage.getItem(sessionKey);
    
    if (!sessionData) return false;
    
    const { expiry } = JSON.parse(sessionData);
    
    if (!expiry || Date.now() > expiry) {
      window.localStorage.removeItem(sessionKey);
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

export function ClientPinGate({
  scope,
  title,
  description,
  ctaLabel,
  children,
}: ClientPinGateProps) {
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local session first (for offline access)
    const hasLocal = hasLocalSession(scope);
    
    if (hasLocal) {
      setHasAccess(true);
      setIsLoading(false);
      return;
    }
    
    // Check server session if online
    const checkServerSession = async () => {
      try {
        const response = await fetch("/api/security/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setHasAccess(data.valid === true);
        }
      } catch (error) {
        console.error("Failed to check server session", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkServerSession();
  }, [scope]);

  const handleSuccess = () => {
    setHasAccess(true);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-brand-ink-muted">Verificando acceso...</div>
      </div>
    );
  }

  if (hasAccess) {
    return <>{children}</>;
  }

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
