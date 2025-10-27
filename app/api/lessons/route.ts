import { NextResponse } from "next/server";

import { getLessonCatalogEntries } from "@/features/student-checkin/data/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const lessons = await getLessonCatalogEntries();
    return NextResponse.json(lessons, {
      headers: {
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    console.error("Failed to load lesson catalog", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las lecciones disponibles." },
      { status: 500 },
    );
  }
}
