"use client";

import { useMemo } from "react";

import { useAttendanceSyncContext } from "@/components/offline/attendance-sync-provider";

function formatTime(timeIso: string | null): string | null {
  if (!timeIso) return null;
  const date = new Date(timeIso);
  if (!Number.isFinite(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function AttendanceSyncIndicator() {
  const { isOnline, isSyncing, pendingCount, lastSuccessfulSyncAt } = useAttendanceSyncContext();

  const label = useMemo(() => {
    if (!isOnline) {
      return {
        icon: "🟠",
        text: "Modo offline – guardando localmente",
        toneClass: "text-brand-orange",
      };
    }

    if (isSyncing || pendingCount > 0) {
      return {
        icon: "🔄",
        text: pendingCount > 0
          ? `Sincronizando ${pendingCount} evento${pendingCount === 1 ? "" : "s"} pendiente${pendingCount === 1 ? "" : "s"}…`
          : "Sincronizando eventos pendientes…",
        toneClass: "text-brand-teal",
      };
    }

    const formatted = formatTime(lastSuccessfulSyncAt);
    return {
      icon: "🟢",
      text: formatted
        ? `Sincronizado. Última sincronización: ${formatted}`
        : "Sincronizado. Eventos al día",
      toneClass: "text-brand-teal",
    };
  }, [isOnline, isSyncing, pendingCount, lastSuccessfulSyncAt]);

  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-brand-ink-muted/20 bg-white px-4 py-2 text-sm font-semibold text-brand-deep shadow">
      <span aria-hidden className="text-lg">{label.icon}</span>
      <span className={label.toneClass}>{label.text}</span>
    </div>
  );
}
