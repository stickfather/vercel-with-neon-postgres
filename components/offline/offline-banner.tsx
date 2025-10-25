"use client";

import { useEffect, useState } from "react";

import { useOfflineStatus } from "@/components/offline/offline-provider";

export function OfflineBanner() {
  const { isOnline, pendingCount, isSyncing } = useOfflineStatus();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setVisible(true);
      return;
    }

    if (pendingCount > 0 || isSyncing) {
      setVisible(true);
      return;
    }

    const timeout = setTimeout(() => setVisible(false), 1500);
    return () => clearTimeout(timeout);
  }, [isOnline, pendingCount, isSyncing]);

  if (!visible) {
    return null;
  }

  const statusLabel = !isOnline
    ? "Esperando conexión a Internet…"
    : pendingCount > 0 || isSyncing
      ? "Sincronizando cambios pendientes…"
      : "Cambios sincronizados.";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-brand-teal bg-white/95 px-5 py-2 text-sm font-semibold text-brand-deep shadow-lg">
        <span aria-hidden="true">{isOnline ? "🔄" : "📡"}</span>
        <span>{statusLabel}</span>
        {pendingCount > 0 ? (
          <span className="rounded-full bg-brand-teal-soft px-2 py-0.5 text-xs font-semibold text-brand-teal">
            {pendingCount}
          </span>
        ) : null}
      </div>
    </div>
  );
}

