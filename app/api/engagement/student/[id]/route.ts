import { NextResponse } from "next/server";

import { fetchStudentProfile } from "src/features/management/engagement/data/engagement.read";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function parseStudentId(id: string | string[] | null): number | null {
  if (!id) return null;
  const value = Array.isArray(id) ? id[0] : id;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolved = await params;
  const studentId = parseStudentId(resolved.id ?? null);
  if (!studentId) {
    return NextResponse.json(
      { error: "Invalid student id." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const profile = await fetchStudentProfile(studentId);
    if (!profile) {
      return NextResponse.json(null, {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      });
    }
    return NextResponse.json(profile, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Failed to fetch engagement student profile", error);
    return NextResponse.json(
      { error: "Unable to load student profile." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
