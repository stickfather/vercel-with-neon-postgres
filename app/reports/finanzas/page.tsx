import { getFinanceReport } from "@/src/features/reports/finance/data";
import { FinancePageClient } from "./FinancePageClient";

export const revalidate = 600;
export const dynamic = "force-dynamic";

export default async function FinanzasPage() {
  const data = await getFinanceReport();

  return <FinancePageClient data={data} />;
}
