import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminCalendarDashboard } from "@/features/administration/components/calendar/admin-calendar";

export const metadata: Metadata = {
  title: "Calendario · Inglés Rápido Manta",
};

export default function CalendarioPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Cargando calendario…</div>}>
      <AdminCalendarDashboard />
    </Suspense>
  );
}
