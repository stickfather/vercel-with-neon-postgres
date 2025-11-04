import { NextResponse } from 'next/server';
import { getInactiveRoster } from '@/src/features/reports/engagement/data';

export const dynamic = "force-dynamic";

const VALID_BUCKETS = ['inactive_7d', 'inactive_14d', 'dormant_30d', 'long_term_inactive_180d'] as const;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bucket = searchParams.get('bucket') ?? 'inactive_7d';
  
  // Validate bucket parameter
  if (!VALID_BUCKETS.includes(bucket as typeof VALID_BUCKETS[number])) {
    return NextResponse.json(
      { error: 'Invalid bucket parameter. Must be one of: ' + VALID_BUCKETS.join(', ') },
      { status: 400 }
    );
  }
  
  const rows = await getInactiveRoster(bucket as typeof VALID_BUCKETS[number]);
  return NextResponse.json(rows);
}
