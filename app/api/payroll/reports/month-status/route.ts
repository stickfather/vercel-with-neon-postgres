import {
  GET as adminGET,
  PATCH as adminPATCH,
} from "@/app/api/(administration)/payroll/reports/month-status/route";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  return adminGET(request);
}

export async function PATCH(request: Request) {
  return adminPATCH(request);
}
