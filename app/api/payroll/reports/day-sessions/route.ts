import {
  GET as adminGET,
  POST as adminPOST,
} from "@/app/api/(administration)/payroll/reports/day-sessions/route";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  return adminGET(request);
}

export async function POST(request: Request) {
  return adminPOST(request);
}
