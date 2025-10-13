# Database Views

This directory contains SQL scripts for creating and maintaining database views used by the application.

## staff_day_sessions_v

The `staff_day_sessions_v` view provides a timezone-safe way to aggregate staff attendance sessions by work date.

### Purpose

This view solves timezone inconsistencies in payroll calculations by:
- Grouping sessions by their local work date in `America/Guayaquil` timezone
- Providing pre-computed session durations in minutes
- Exposing both timestamptz and localized timestamp columns for flexibility

### Schema

| Column | Type | Description |
|--------|------|-------------|
| `session_id` | bigint | Primary key from staff_attendance.id |
| `staff_id` | bigint | Reference to staff_members.id |
| `work_date` | date | Local date in America/Guayaquil when session started |
| `checkin_time` | timestamptz | Original check-in timestamp (UTC-aware) |
| `checkout_time` | timestamptz | Original check-out timestamp (UTC-aware) |
| `checkin_local` | timestamp | Check-in converted to America/Guayaquil time |
| `checkout_local` | timestamp | Check-out converted to America/Guayaquil time |
| `minutes` | integer | Session duration in minutes (>= 0) |

### Deployment

To create or update this view in your database:

```bash
# Using psql
psql $DATABASE_URL -f db/views/staff_day_sessions_v.sql

# Or using Neon CLI
neonctl sql < db/views/staff_day_sessions_v.sql

# Or manually execute the SQL in your database client
```

### Key Features

1. **Timezone-aware grouping**: Sessions are grouped by the date they started in `America/Guayaquil`, not UTC
2. **UTC-safe duration**: Duration calculation uses timestamptz subtraction which handles DST correctly
3. **Local time display**: Provides `_local` columns for UI display without client-side conversion
4. **Null-safe**: Handles sessions without checkout using `COALESCE(checkout_time, checkin_time)`

### Dependencies

- Table: `public.staff_attendance`
  - Columns: `id`, `staff_id`, `checkin_time` (timestamptz), `checkout_time` (timestamptz)
- Timezone: `America/Guayaquil` must be available in PostgreSQL

### Usage

```sql
-- Get all sessions for a staff member on a specific date
SELECT *
FROM public.staff_day_sessions_v
WHERE staff_id = 123
  AND work_date = '2025-10-15'
ORDER BY checkin_time;

-- Aggregate total hours for a month
SELECT 
  staff_id,
  work_date,
  SUM(minutes) / 60.0 AS total_hours
FROM public.staff_day_sessions_v
WHERE work_date >= '2025-10-01'
  AND work_date < '2025-11-01'
GROUP BY staff_id, work_date
ORDER BY staff_id, work_date;
```

### Migration Note

This view replaces manual timezone conversion in application code. After deploying:
1. The view must be created before the application can use it
2. No data migration needed - view is computed on-the-fly
3. Indexes on `staff_attendance(checkin_time)` will help performance
4. Consider adding index on `staff_attendance(staff_id, checkin_time)` for optimal query performance

### Troubleshooting

**Error: timezone "America/Guayaquil" not recognized**
- Ensure PostgreSQL has timezone data installed
- Check: `SELECT * FROM pg_timezone_names WHERE name = 'America/Guayaquil';`

**Performance issues**
- Add index: `CREATE INDEX idx_staff_attendance_checkin ON staff_attendance(staff_id, checkin_time);`
- Add index: `CREATE INDEX idx_staff_attendance_work_date ON staff_attendance((checkin_time AT TIME ZONE 'America/Guayaquil')::date);`
