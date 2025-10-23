import {
  PATCH as adminPATCH,
  DELETE as adminDELETE,
} from "@/app/api/(administration)/payroll/reports/day-sessions/[sessionId]/route";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type PatchContext = Parameters<typeof adminPATCH>[1];
type DeleteContext = Parameters<typeof adminDELETE>[1];

export async function PATCH(request: Request, context: PatchContext) {
  return adminPATCH(request, context);
}

export async function DELETE(request: Request, context: DeleteContext) {
  return adminDELETE(request, context);
}
