import * as adminRoute from "@/app/api/(administration)/payroll/reports/month-status/route";

export const dynamic = adminRoute.dynamic;
export const revalidate = adminRoute.revalidate;
export const fetchCache = adminRoute.fetchCache;

export async function GET(request: Request) {
  return adminRoute.GET(request);
}

export async function PATCH(request: Request) {
  return adminRoute.PATCH(request);
}
