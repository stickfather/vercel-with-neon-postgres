import type { Metadata } from "next";

import { ManagementReportsDashboard } from "@/features/management-reports/components/management-reports-dashboard";

export const metadata: Metadata = {
  title: "Reportes gerenciales · Inglés Rápido Manta",
  description:
    "Visión ejecutiva del centro: aprendizaje, engagement, finanzas, exámenes y personal en tiempo real.",
};

export default function ManagementReportsPage() {
  return <ManagementReportsDashboard />;
}
