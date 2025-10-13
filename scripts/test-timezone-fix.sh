#!/bin/bash
# Test script for payroll timezone fix
# This script helps verify the database changes work correctly

set -e

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable not set"
  echo "Please set DATABASE_URL to your Neon Postgres connection string"
  exit 1
fi

echo "Testing payroll timezone fix..."
echo ""

# Apply migration
echo "1. Applying migration..."
psql "$DATABASE_URL" -f db/migrations/20251013_staff_day_sessions_v_guayaquil.sql
echo "✓ Migration applied"
echo ""

# Test 1: Verify view exists and has correct columns
echo "2. Verifying view structure..."
psql "$DATABASE_URL" -c "\d+ staff_day_sessions_v" | grep -q "work_date" && echo "✓ work_date column exists"
psql "$DATABASE_URL" -c "\d+ staff_day_sessions_v" | grep -q "minutes" && echo "✓ minutes column exists"
echo ""

# Test 2: Check for data
echo "3. Checking for data in view..."
COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM public.staff_day_sessions_v")
echo "   Found $COUNT sessions in view"
echo ""

# Test 3: Verify work_date timezone handling
echo "4. Testing work_date timezone conversion..."
psql "$DATABASE_URL" -c "
SELECT 
  checkin_time,
  (checkin_time AT TIME ZONE 'America/Guayaquil')::date as work_date,
  work_date as view_work_date
FROM public.staff_day_sessions_v 
LIMIT 3;" || true
echo ""

# Test 4: Generate days for October 2025
echo "5. Testing days generation for October 2025..."
psql "$DATABASE_URL" -c "
SELECT generate_series(
  '2025-10-01'::date,
  ('2025-11-01'::date - interval '1 day')::date,
  interval '1 day'
)::date::text AS work_date
LIMIT 5;" || true
echo ""

echo "✓ All tests completed"
echo ""
echo "Next steps:"
echo "1. Start your development server: npm run dev"
echo "2. Navigate to payroll reports"
echo "3. Select October 2025"
echo "4. Verify no 30-SEPT column appears"
echo "5. Click cells with hours and verify modal shows sessions"
