# Payroll Timezone Fix - Technical Implementation

## Problem Statement

The payroll reports were experiencing timezone-related issues:
1. **Month boundary leakage**: October matrix showed "30-SEPT" as first column
2. **Empty day modals**: Days with non-zero hours showed "No hay sesiones" in modal
3. **Data mismatch**: Matrix totals didn't match modal session lists

**Root Cause:** The `staff_day_sessions_v` view was computing `work_date` without explicit timezone conversion, causing sessions near midnight to be grouped into the wrong day when converting between UTC and local time (America/Guayaquil, UTC-5).

## Solution Overview

This fix makes the database view the authoritative source for date grouping by:
1. Computing `work_date` explicitly in America/Guayaquil timezone
2. Generating month days array in Postgres (not JavaScript)
3. Ensuring all queries use the view's `work_date` for consistency

## Changes Made

### 1. Database View (Authoritative Source)

**File:** `db/migrations/20251013_staff_day_sessions_v_guayaquil.sql`

Created a migration that replaces the `staff_day_sessions_v` view:

```sql
CREATE OR REPLACE VIEW public.staff_day_sessions_v AS
SELECT
  sa.id AS session_id,
  sa.staff_id,
  (sa.checkin_time AT TIME ZONE 'America/Guayaquil')::date AS work_date,
  sa.checkin_time,
  sa.checkout_time,
  GREATEST(
    0,
    FLOOR(
      EXTRACT(EPOCH FROM (COALESCE(sa.checkout_time, sa.checkin_time) - sa.checkin_time)) / 60.0
    )::numeric
  )::integer AS minutes
FROM public.staff_attendance sa
WHERE sa.checkin_time IS NOT NULL;
```

**Key Points:**
- `work_date` is computed as `(checkin_time AT TIME ZONE 'America/Guayaquil')::date`
- This ensures a session at 23:00 local time appears in the same day, not the next day
- Duration calculation uses `EXTRACT(EPOCH ...)` for accurate minute counts
- Returns `session_id`, `staff_id`, `work_date`, timestamps, and `minutes`

### 2. API Endpoints

#### month-summary endpoint

**File:** `app/api/(administration)/payroll/reports/month-summary/route.ts`

Updated to generate days in Postgres and aggregate entries:

```typescript
// Generate days array using Postgres
const daysResult = await sql`
  SELECT generate_series(
    ${monthStart}::date,
    (${monthEndExclusive}::date - interval '1 day')::date,
    interval '1 day'
  )::date::text AS work_date
`;

// Aggregate sessions from view
const entriesResult = await sql`
  SELECT
    staff_id,
    work_date::text AS work_date,
    SUM(COALESCE(minutes, 0))::integer AS minutes
  FROM public.staff_day_sessions_v
  WHERE work_date >= ${monthStart}::date
    AND work_date < ${monthEndExclusive}::date
  GROUP BY staff_id, work_date
`;
```

**Response Format:**
```json
{
  "days": ["2025-10-01", "2025-10-02", ..., "2025-10-31"],
  "entries": [
    { "staff_id": 1, "work_date": "2025-10-01", "minutes": 480 },
    ...
  ]
}
```

#### day-sessions endpoint

**File:** `features/administration/data/payroll-reports.ts` (fetchDaySessions)

Simplified to use work_date equality only:

```sql
SELECT *
FROM public.staff_day_sessions_v s
WHERE s.staff_id = $1::bigint
  AND s.work_date = $2::date
ORDER BY s.checkin_time ASC
```

**Before:** Had an OR clause checking timezone-converted checkin_time
**After:** Relies solely on view's `work_date` column (authoritative)

### 3. Data Layer

#### fetchPayrollMatrix

**File:** `features/administration/data/payroll-reports.ts`

Updated to generate days in Postgres:

```typescript
// Generate days array using Postgres (not JS)
const daysResult = await sql`
  SELECT generate_series(
    ${monthStart}::date,
    (${monthEndExclusive}::date - interval '1 day')::date,
    interval '1 day'
  )::date::text AS work_date
`;
const days = daysResult.map((row) => row.work_date);
```

**Before:** Used `enumerateDaysFromStrings` (JS-based date arithmetic)
**After:** Uses Postgres `generate_series` (database-based, no timezone issues)

### 4. UI Components

**No changes required** - the UI was already properly structured:
- Matrix renders from `matrixData.days` array from API
- Modal fetches from day-sessions endpoint with date parameter
- No local date enumeration or timezone conversions

## Testing

### Automated Tests
✅ All 41 existing tests pass
- Date enumeration tests
- Session bucketing tests
- Timezone handling tests

### Manual Testing Required

1. **October 2025 Matrix Test**
   - Navigate to payroll reports
   - Select October 2025
   - Verify header shows only "01-OCT" through "31-OCT"
   - Verify no "30-SEPT" column appears

2. **Day Modal Test**
   - Click on a cell with non-zero hours (e.g., 8.5 hours)
   - Verify modal opens and shows session list
   - Verify total hours in modal matches cell value

3. **Month Boundary Test**
   - Test a session at 23:00 on Sept 30 (local time)
   - Should appear in Sept 30 column, not Oct 1
   - Modal for Sept 30 should show the session

## Deployment Steps

1. **Apply Database Migration**
   ```bash
   psql $DATABASE_URL -f db/migrations/20251013_staff_day_sessions_v_guayaquil.sql
   ```

2. **Deploy Application Code**
   - No environment variables needed
   - No schema changes, just view replacement
   - Zero downtime deployment

3. **Verify Deployment**
   - Check October 2025 payroll matrix
   - Test day modal for several dates
   - Verify totals match expectations

## Rollback Plan

If issues arise, the view can be reverted by recreating it with the old definition (if it exists in version control) or by dropping and recreating with a corrected definition.

```sql
-- Rollback by dropping the view (if needed)
DROP VIEW IF EXISTS public.staff_day_sessions_v;

-- Then recreate with old or corrected definition
```

## Performance Impact

**None expected** - View replacement doesn't change performance characteristics:
- Same underlying query patterns
- Same indexes on base table
- View is not materialized (computed on demand)

## Security Impact

**None** - No changes to permissions, authentication, or authorization.

## Future Enhancements

1. **Parameterized Timezone**: Move timezone to environment variable
2. **Midnight-Spanning Sessions**: Handle sessions that cross midnight
3. **Materialized View**: Consider materialization for performance at scale
4. **DST Handling**: Add specific tests for DST transitions

## References

- Problem Statement: GitHub Issue #[number]
- Timezone: America/Guayaquil (UTC-5, no DST)
- Database: Neon Postgres
- View Documentation: `db/migrations/README.md`
