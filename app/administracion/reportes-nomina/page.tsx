import type { Metadata } from "next";
import { PayrollReportsDashboard } from "@/features/administration/components/payroll-reports/payroll-reports-dashboard";

export const metadata: Metadata = {
  title: "Reportes de nómina · Inglés Rápido Manta",
};

export const revalidate = 0;

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export default function ReportesNominaPage() {
  const currentMonth = getCurrentMonth();

  return <PayrollReportsDashboard initialMonth={currentMonth} />;
}
