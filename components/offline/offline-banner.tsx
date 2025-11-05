"use client";

import { useOfflineStatus } from "@/components/offline/offline-provider";

export function OfflineBanner() {
  const { isOnline } = useOfflineStatus();

  // Only show banner when offline
  if (isOnline) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-brand-orange bg-white/95 px-5 py-2 text-sm font-semibold text-brand-deep shadow-lg">
        <span aria-hidden="true">📡</span>
        <span>Sin conexión • Los cambios se guardarán y sincronizarán cuando se restablezca Internet</span>
      </div>
    </div>
  );
}

