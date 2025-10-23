import * as adminRoute from "@/app/api/(administration)/payroll/reports/override-and-approve/route";

export const dynamic = adminRoute.dynamic;
export const revalidate = adminRoute.revalidate;
export const fetchCache = adminRoute.fetchCache;

export async function POST(request: Request) {
  return adminRoute.POST(request);
}
