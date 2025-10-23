import * as adminRoute from "@/app/api/(administration)/payroll/reports/day-sessions/[sessionId]/route";

export const dynamic = adminRoute.dynamic;
export const revalidate = adminRoute.revalidate;
export const fetchCache = adminRoute.fetchCache;

export async function PATCH(
  request: Request,
  context: Parameters<typeof adminRoute.PATCH>[1],
) {
  return adminRoute.PATCH(request, context);
}

export async function DELETE(
  request: Request,
  context: Parameters<typeof adminRoute.DELETE>[1],
) {
  return adminRoute.DELETE(request, context);
}
