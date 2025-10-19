# Payroll Report Session Times Fix

## Problem Statement

In the payroll reports page, when viewing session details for a specific day, the "entrada actual" (actual entry) and "salida actual" (actual exit) times were displaying incorrectly. The times shown differed from what they should be, causing confusion for payroll administrators.

## Root Cause

The `getDaySessions` function in `lib/payroll/reports-service.ts` was querying a database view (`staff_day_sessions_with_edits_v`) that returned timestamp columns named `checkin_local` and `checkout_local`. While the column names suggested they were already in local timezone, the actual values returned from the database were ambiguous and not properly timezone-converted.

### Why This Happened

PostgreSQL can return timestamps in different formats:
1. **TIMESTAMPTZ** - Timestamp with timezone information (e.g., `2024-01-15 10:00:00+00`)
2. **TIMESTAMP** - Timestamp without timezone (e.g., `2024-01-15 10:00:00`)

When a view returns timestamps without explicit timezone conversion:
- The database may return UTC timestamps
- JavaScript's `Date` constructor may misinterpret timestamps without timezone info
- The displayed time could be off by the timezone offset (5 hours for America/Guayaquil)

## Solution

Modified the `getDaySessions` function to bypass the view and query the `staff_attendance` table directly with explicit timezone conversion:

```typescript
await sql`
  SELECT
    sa.id AS session_id,
    to_char(sa.checkin_time AT TIME ZONE ${TIMEZONE}, 'YYYY-MM-DD HH24:MI:SS') AS checkin_local,
    to_char(sa.checkout_time AT TIME ZONE ${TIMEZONE}, 'YYYY-MM-DD HH24:MI:SS') AS checkout_local,
    -- ... other fields
  FROM public.staff_attendance sa
  LEFT JOIN public.staff_attendance_edits sae ON sae.attendance_id = sa.id
  WHERE sa.staff_id = ${params.staffId}::bigint
    AND DATE(sa.checkin_time AT TIME ZONE ${TIMEZONE}) = ${params.date}::date
  ORDER BY sa.checkin_time
`
```

### Key Changes

1. **Direct Table Query**: Query `staff_attendance` directly instead of using the view
2. **Explicit Timezone Conversion**: Use `AT TIME ZONE ${TIMEZONE}` to convert UTC timestamps to America/Guayaquil timezone
3. **String Formatting**: Use `to_char()` to format timestamps as 'YYYY-MM-DD HH24:MI:SS' strings
4. **Edit Handling**: JOIN with `staff_attendance_edits` to include original timestamps when sessions were edited

### How It Works

1. Database stores timestamps in UTC (TIMESTAMPTZ type)
2. Query converts UTC to America/Guayaquil timezone using `AT TIME ZONE 'America/Guayaquil'`
3. `to_char()` formats the converted timestamp as a string without timezone suffix
4. Frontend receives unambiguous local time strings like `"2024-01-15 15:00:00"`
5. The `normalizeLocalDateTimeString` function in the frontend correctly interprets these as local times

## Example

**Before Fix:**
- Database UTC timestamp: `2024-01-15 20:00:00+00` (8 PM UTC)
- View might return: `2024-01-15 20:00:00` (ambiguous)
- Frontend displays: `20:00` (incorrect - should be 15:00 local time)

**After Fix:**
- Database UTC timestamp: `2024-01-15 20:00:00+00` (8 PM UTC)
- Query converts: `2024-01-15 20:00:00+00 AT TIME ZONE 'America/Guayaquil'` → `2024-01-15 15:00:00`
- `to_char()` formats: `"2024-01-15 15:00:00"`
- Frontend displays: `15:00` (correct local time)

## Verification

### Automated Tests
- ✅ All 66 tests pass
- ✅ TypeScript compilation succeeds
- ✅ CodeQL security scan: 0 vulnerabilities

### Manual Verification Steps

1. Navigate to Payroll Reports page
2. Select a month with existing sessions
3. Click on any cell with recorded hours
4. Verify the session modal displays:
   - **Entrada actual**: Shows the correct local time the staff member checked in
   - **Salida actual**: Shows the correct local time the staff member checked out
5. Compare with raw database values (if accessible):
   ```sql
   SELECT 
     checkin_time,
     checkin_time AT TIME ZONE 'America/Guayaquil' AS checkin_local,
     checkout_time,
     checkout_time AT TIME ZONE 'America/Guayaquil' AS checkout_local
   FROM staff_attendance
   WHERE staff_id = <staff_id> AND DATE(checkin_time AT TIME ZONE 'America/Guayaquil') = '<date>';
   ```

## Impact

### Benefits
- ✅ Session times now display correctly in America/Guayaquil timezone
- ✅ Eliminates confusion for payroll administrators
- ✅ Prevents potential payroll calculation errors
- ✅ Provides accurate audit trail for session times

### Backward Compatibility
- ✅ No breaking changes
- ✅ No database schema changes required
- ✅ All existing tests pass
- ✅ API endpoints unchanged

## Technical Notes

### Timezone Configuration

The application uses the `TIMEZONE` constant defined in `lib/db/client.ts`:
```typescript
export const TIMEZONE = "America/Guayaquil";
```

This timezone:
- Is UTC-5 (no daylight saving time)
- Used consistently throughout the application
- Applies to all timestamp conversions in payroll reports

### PostgreSQL Timezone Operators

The fix uses PostgreSQL's timezone conversion operators:

1. **AT TIME ZONE**: Converts timestamp to a specific timezone
   ```sql
   timestamp_column AT TIME ZONE 'America/Guayaquil'
   ```

2. **to_char()**: Formats timestamp as string
   ```sql
   to_char(timestamp_column, 'YYYY-MM-DD HH24:MI:SS')
   ```

### Frontend Interpretation

The frontend's `normalizeLocalDateTimeString` function (in `features/administration/data/payroll-reports.ts`) correctly handles the formatted strings:
- Treats the input as local time
- Converts to UTC for internal representation
- Displays using `Intl.DateTimeFormat` with timezone

## Related Issues

This fix is related to the earlier timezone fix documented in `PAYROLL_TIMEZONE_FIX.md`, which addressed:
- Month boundary leakage in day enumeration
- Session query mismatch for days near midnight

Both fixes work together to ensure consistent timezone handling across the payroll reports system.

## Future Improvements

Consider these enhancements:

1. **Update Database Views**: Modify `staff_day_sessions_with_edits_v` to include explicit timezone conversion
2. **Centralize Timezone Logic**: Create a shared SQL function for timezone conversion
3. **Add Timezone Display**: Show timezone indicator in the UI (e.g., "15:00 ECT")
4. **Audit Trail**: Log timezone conversions for debugging purposes

## References

- Issue: Payroll report session times displaying incorrectly
- Pull Request: [Link to PR]
- Related Fix: `PAYROLL_TIMEZONE_FIX.md`
- PostgreSQL Docs: [Date/Time Functions](https://www.postgresql.org/docs/current/functions-datetime.html)
- Timezone Database: America/Guayaquil (UTC-5, no DST)
