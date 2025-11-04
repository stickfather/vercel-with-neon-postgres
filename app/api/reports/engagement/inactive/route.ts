import { NextResponse } from 'next/server';
import { getInactiveRoster } from '@/src/features/reports/engagement/data';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bucket = (searchParams.get('bucket') ?? 'inactive_7d') as 'inactive_7d'|'inactive_14d'|'dormant_30d'|'long_term_inactive_180d';
  const rows = await getInactiveRoster(bucket);
  return NextResponse.json(rows);
}
