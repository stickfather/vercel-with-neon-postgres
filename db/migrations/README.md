# Database Migrations

This directory contains SQL migration files for the application.

## Applying Migrations

To apply the migrations to your database, connect to your Neon Postgres instance and run the SQL files in order.

### Using psql

```bash
psql $DATABASE_URL -f db/migrations/20251013_staff_day_sessions_v_guayaquil.sql
```

### Using Neon SQL Editor

1. Go to your Neon project console
2. Open the SQL Editor
3. Copy and paste the contents of the migration file
4. Execute the SQL

## Migration: 20251013_staff_day_sessions_v_guayaquil.sql

This migration creates or replaces the `staff_day_sessions_v` view to use `America/Guayaquil` timezone for work_date computation.

**Purpose:** Fix timezone handling in payroll reports by ensuring work_date is computed in the application timezone, not UTC.

**What it does:**
- Creates/replaces the `public.staff_day_sessions_v` view
- Computes `work_date` as `(checkin_time AT TIME ZONE 'America/Guayaquil')::date`
- Calculates session duration in minutes
- Ensures consistent date grouping for payroll aggregations

**Impact:**
- This is a view replacement, not a schema change
- No data migration required
- Existing queries will use the new view definition automatically
- Fixes the issue where sessions near midnight UTC appeared in wrong days

**Testing:**
After applying this migration, verify that:
1. October 2025 payroll shows only days 1-31 (no Sept 30)
2. Sessions at 23:00 local time appear in the correct day
3. Day modal totals match matrix cell values
