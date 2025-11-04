"use client";

import { useOfflineStatus } from "@/components/offline/offline-provider";

export function OfflineBanner() {
  const { isOnline } = useOfflineStatus();

  // Only show orange banner when offline
  if (isOnline) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-[#ff9800] bg-gradient-to-r from-[#ff9800] to-[#ff6d00] px-5 py-3 text-sm font-semibold text-white shadow-lg">
        <span aria-hidden="true" className="text-base">🟠</span>
        <span>Modo offline – guardando localmente</span>
      </div>
    </div>
  );
}

