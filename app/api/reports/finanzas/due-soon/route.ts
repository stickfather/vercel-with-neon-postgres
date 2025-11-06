import { NextResponse } from "next/server";
import { getDueSoonRoster } from "@/src/features/reports/finance/data";

export const revalidate = 600;
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getDueSoonRoster();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Error cargando lista de vencimientos próximos", error);
    return NextResponse.json(
      { error: "No pudimos cargar la lista de vencimientos próximos." },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
