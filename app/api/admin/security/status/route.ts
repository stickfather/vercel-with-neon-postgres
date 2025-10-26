import { NextResponse } from "next/server";

import { getSecurityPinStatuses } from "@/features/security/data/pins";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET() {
  try {
    const statuses = await getSecurityPinStatuses();
    const manager = statuses.find((status) => status.scope === "manager") ?? {
      scope: "manager",
      isSet: false,
      updatedAt: null,
    };
    const staff = statuses.find((status) => status.scope === "staff") ?? {
      scope: "staff",
      isSet: false,
      updatedAt: null,
    };

    return NextResponse.json(
      {
        manager: { isSet: manager.isSet, updatedAt: manager.updatedAt },
        staff: { isSet: staff.isSet, updatedAt: staff.updatedAt },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("No se pudo obtener el estado de los PIN", error);
    return NextResponse.json(
      {
        manager: { isSet: false, updatedAt: null },
        staff: { isSet: false, updatedAt: null },
        error: "No pudimos obtener el estado de los PIN.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
