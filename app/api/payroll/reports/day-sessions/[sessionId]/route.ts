import * as adminRoute from "@/app/api/(administration)/payroll/reports/day-sessions/[sessionId]/route";

export const dynamic = adminRoute.dynamic;
export const revalidate = adminRoute.revalidate;
export const fetchCache = adminRoute.fetchCache;

export async function PATCH(request: Request) {
  return adminRoute.PATCH(request);
}

export async function DELETE(request: Request) {
  return adminRoute.DELETE(request);
}
