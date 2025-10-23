import { POST as adminPOST } from "@/app/api/(administration)/payroll/reports/approve-day/route";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  return adminPOST(request);
}
