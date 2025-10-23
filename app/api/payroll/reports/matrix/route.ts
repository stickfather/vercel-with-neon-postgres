import { GET as adminGET } from "@/app/api/(administration)/payroll/reports/matrix/route";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  return adminGET(request);
}
