import * as adminRoute from "@/app/api/(administration)/payroll/reports/day-sessions/route";

export const dynamic = adminRoute.dynamic;
export const revalidate = adminRoute.revalidate;
export const fetchCache = adminRoute.fetchCache;

export async function GET(request: Request) {
  return adminRoute.GET(request);
}

export async function POST(request: Request) {
  return adminRoute.POST(request);
}
