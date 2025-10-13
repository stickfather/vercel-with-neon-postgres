# Database Setup and Deployment

This guide covers the database setup required for the payroll system to work correctly.

## Required Database Views

The application requires specific database views to be created in your Neon PostgreSQL database. These views provide timezone-aware data processing for accurate payroll calculations.

## Quick Setup

### 1. Connect to Your Database

First, ensure you have your Neon database connection string from the [Neon Dashboard](https://console.neon.tech/):

```bash
export DATABASE_URL="postgresql://user:password@host/db"
```

### 2. Deploy the Views

You have several options to deploy the database views:

#### Option A: Using psql (Recommended)

```bash
psql $DATABASE_URL -f db/views/staff_day_sessions_v.sql
```

#### Option B: Using Neon SQL Editor

1. Go to your project in the [Neon Console](https://console.neon.tech/)
2. Navigate to the SQL Editor
3. Copy the contents of `db/views/staff_day_sessions_v.sql`
4. Paste and execute in the SQL Editor

#### Option C: Using Node.js Script

```bash
node -e "
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const sql = neon(process.env.DATABASE_URL);
const query = fs.readFileSync('db/views/staff_day_sessions_v.sql', 'utf8');
sql(query).then(() => console.log('View created successfully')).catch(console.error);
"
```

## Required Views

### staff_day_sessions_v

This view is critical for the payroll system. It:
- Groups staff attendance by local work date (America/Guayaquil timezone)
- Provides timezone-aware session data
- Computes session durations in minutes

**Location**: `db/views/staff_day_sessions_v.sql`

**Dependencies**: 
- Table `public.staff_attendance` with columns:
  - `id` (bigint)
  - `staff_id` (bigint)
  - `checkin_time` (timestamptz)
  - `checkout_time` (timestamptz)

## Verification

After deploying the view, verify it works correctly:

```sql
-- Check the view exists
SELECT COUNT(*) FROM public.staff_day_sessions_v;

-- Check the view structure
\d public.staff_day_sessions_v

-- Test with sample data
SELECT 
  staff_id,
  work_date,
  checkin_local,
  checkout_local,
  minutes
FROM public.staff_day_sessions_v
ORDER BY work_date DESC, checkin_time DESC
LIMIT 10;
```

Expected output should show:
- `work_date` as a DATE (YYYY-MM-DD format)
- `checkin_local` and `checkout_local` as TIMESTAMP WITHOUT TIME ZONE
- `minutes` as INTEGER (session duration)

## Performance Optimization (Optional)

For better query performance, consider adding these indexes:

```sql
-- Index on staff_id and checkin_time (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff_checkin 
ON public.staff_attendance(staff_id, checkin_time);

-- Index on the computed work_date for faster filtering
CREATE INDEX IF NOT EXISTS idx_staff_attendance_work_date 
ON public.staff_attendance((checkin_time AT TIME ZONE 'America/Guayaquil')::date);
```

## Troubleshooting

### Error: relation "staff_attendance" does not exist

**Solution**: Ensure your database has the `staff_attendance` table created. Check your schema or run any pending migrations.

### Error: timezone "America/Guayaquil" not recognized

**Solution**: PostgreSQL timezone data should be installed by default. If not:
1. Check available timezones: `SELECT * FROM pg_timezone_names WHERE name LIKE 'America/%';`
2. Contact your database provider if the timezone is missing

### Error: permission denied for schema public

**Solution**: Ensure your database user has CREATE privileges:
```sql
GRANT CREATE ON SCHEMA public TO your_user;
```

### View shows no data or wrong dates

**Solution**: 
1. Verify `staff_attendance` has data with `checkin_time IS NOT NULL`
2. Check that `checkin_time` and `checkout_time` are stored as `timestamptz`
3. Verify the timezone conversion: 
   ```sql
   SELECT 
     checkin_time,
     checkin_time AT TIME ZONE 'America/Guayaquil' AS local_time,
     (checkin_time AT TIME ZONE 'America/Guayaquil')::date AS work_date
   FROM staff_attendance
   LIMIT 5;
   ```

## Updating the View

If the view definition changes in future updates, you can safely recreate it:

```bash
# The SQL file uses CREATE OR REPLACE VIEW, so you can just re-run it
psql $DATABASE_URL -f db/views/staff_day_sessions_v.sql
```

This will update the view definition without losing any data (views don't store data, they compute it on-the-fly).

## Next Steps

After deploying the database views:

1. ✅ Verify the view works with the verification queries above
2. ✅ Start the development server: `npm run dev`
3. ✅ Navigate to the Payroll Reports page
4. ✅ Check that the October 2025 matrix shows exactly 31 days (no Sept 30 or Nov 1)
5. ✅ Click on any cell with hours and verify the modal shows matching sessions

## Additional Documentation

- View details and schema: [db/views/README.md](./db/views/README.md)
- Timezone fix explanation: [PAYROLL_TIMEZONE_FIX.md](./PAYROLL_TIMEZONE_FIX.md)
- Verification checklist: [VERIFICATION_CHECKLIST.md](./VERIFICATION_CHECKLIST.md)
