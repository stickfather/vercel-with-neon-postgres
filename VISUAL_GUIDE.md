# Payroll Timezone Fix - Visual Guide

## Problem Visualization

### Before Fix (UTC-based work_date)

```
Session at 23:00 local time (2025-09-30 23:00 ECT)
        ↓
Stored as 2025-10-01 04:00:00 UTC (timestamptz)
        ↓
View computed work_date as: 2025-10-01 (from UTC date)
        ↓
❌ WRONG: Session appears in October 1st instead of September 30th
        ↓
Matrix shows: 30-SEPT | 01-OCT | 02-OCT | ...
                        ↑ session here (wrong!)
```

### After Fix (Guayaquil timezone work_date)

```
Session at 23:00 local time (2025-09-30 23:00 ECT)
        ↓
Stored as 2025-10-01 04:00:00 UTC (timestamptz)
        ↓
View computes: (checkin_time AT TIME ZONE 'America/Guayaquil')::date
        ↓
Result: 2025-09-30 (local date!)
        ↓
✅ CORRECT: Session appears in September 30th
        ↓
Matrix shows: 30-SEPT | 01-OCT | 02-OCT | ...
              ↑ session here (correct!)
```

---

## Data Flow Architecture

### Before Fix

```
┌─────────────────────────────────────────────────────────┐
│ staff_attendance table (source)                         │
│ - checkin_time: timestamptz (UTC)                       │
│ - checkout_time: timestamptz (UTC)                      │
└────────────────┬────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────┐
│ staff_day_sessions_v view (OLD)                         │
│ - work_date: computed from UTC (wrong!)                 │
│ - minutes: session duration                             │
└────────────────┬────────────────────────────────────────┘
                 │
     ┌───────────┴───────────┐
     ↓                       ↓
┌─────────────┐        ┌─────────────┐
│ Matrix API  │        │ Modal API   │
│ - OR clause │        │ - OR clause │
│ - JS dates  │        │ - Fallback  │
└──────┬──────┘        └──────┬──────┘
       │                      │
       └──────────┬───────────┘
                  ↓
         ❌ Data mismatch!
         Matrix ≠ Modal
```

### After Fix

```
┌─────────────────────────────────────────────────────────┐
│ staff_attendance table (source)                         │
│ - checkin_time: timestamptz (UTC)                       │
│ - checkout_time: timestamptz (UTC)                      │
└────────────────┬────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────┐
│ staff_day_sessions_v view (NEW) ✨                      │
│ - work_date: (checkin AT TIME ZONE 'America/Guayaquil') │
│ - minutes: session duration                             │
│ ✅ AUTHORITATIVE DATE SOURCE                            │
└────────────────┬────────────────────────────────────────┘
                 │
     ┌───────────┴───────────┐
     ↓                       ↓
┌─────────────┐        ┌─────────────┐
│ Matrix API  │        │ Modal API   │
│ - Postgres  │        │ - work_date │
│   days      │        │   equality  │
│ - view agg  │        │ - view rows │
└──────┬──────┘        └──────┬──────┘
       │                      │
       └──────────┬───────────┘
                  ↓
         ✅ Data consistent!
         Matrix === Modal
```

---

## Database View Logic

### View Definition

```sql
CREATE OR REPLACE VIEW public.staff_day_sessions_v AS
SELECT
  sa.id AS session_id,
  sa.staff_id,
  -- 🔑 KEY: Convert UTC to Guayaquil, then extract date
  (sa.checkin_time AT TIME ZONE 'America/Guayaquil')::date AS work_date,
  sa.checkin_time,
  sa.checkout_time,
  -- Calculate duration in minutes
  GREATEST(
    0,
    FLOOR(
      EXTRACT(EPOCH FROM (COALESCE(sa.checkout_time, sa.checkin_time) - sa.checkin_time)) / 60.0
    )::numeric
  )::integer AS minutes
FROM public.staff_attendance sa
WHERE sa.checkin_time IS NOT NULL;
```

### Example Computation

```
Input (staff_attendance):
┌─────┬──────────┬─────────────────────────────┬─────────────────────────────┐
│ id  │ staff_id │ checkin_time (UTC)          │ checkout_time (UTC)         │
├─────┼──────────┼─────────────────────────────┼─────────────────────────────┤
│ 100 │ 1        │ 2025-10-01 04:00:00+00      │ 2025-10-01 13:00:00+00      │
└─────┴──────────┴─────────────────────────────┴─────────────────────────────┘
          ↓
    AT TIME ZONE 'America/Guayaquil'
          ↓
┌─────────────────────────────┬─────────────────────────────┐
│ 2025-09-30 23:00:00 (local) │ 2025-10-01 08:00:00 (local) │
└─────────────────────────────┴─────────────────────────────┘
          ↓
      ::date
          ↓

Output (staff_day_sessions_v):
┌────────────┬──────────┬────────────┬─────────┐
│ session_id │ staff_id │ work_date  │ minutes │
├────────────┼──────────┼────────────┼─────────┤
│ 100        │ 1        │ 2025-09-30 │ 540     │
└────────────┴──────────┴────────────┴─────────┘
                         ↑
                   Correct date!
                   (Sept 30, not Oct 1)
```

---

## API Response Changes

### Matrix API (month-summary)

**Before:**
```json
{
  "rows": [...]  // Just aggregated data
}
```

**After:**
```json
{
  "days": [
    "2025-10-01", "2025-10-02", ..., "2025-10-31"
  ],  // ✨ Generated in Postgres
  "entries": [
    { "staff_id": 1, "work_date": "2025-10-01", "minutes": 480 },
    { "staff_id": 1, "work_date": "2025-10-02", "minutes": 510 }
  ]  // ✨ From authoritative view
}
```

### Day Sessions API

**Query Before:**
```sql
WHERE s.staff_id = $1
  AND (s.work_date = $2 OR DATE(timezone('...', s.checkin_time)) = $2)
      ↑ Fallback for wrong work_date
```

**Query After:**
```sql
WHERE s.staff_id = $1
  AND s.work_date = $2
      ↑ Simple equality! View is authoritative
```

---

## Month Boundary Example

### October 2025 Headers

**Before Fix:**
```
┌──────────┬───────────┬───────────┬─────┬───────────┐
│ 30-SEPT  │ 01-OCT    │ 02-OCT    │ ... │ 31-OCT    │
│ (wrong!) │           │           │     │           │
└──────────┴───────────┴───────────┴─────┴───────────┘
```

**After Fix:**
```
┌───────────┬───────────┬─────┬───────────┐
│ 01-OCT    │ 02-OCT    │ ... │ 31-OCT    │
│ (correct!)│           │     │           │
└───────────┴───────────┴─────┴───────────┘
```

---

## Testing Checklist

### ✅ Automated Tests
- [x] 41/41 tests pass
- [x] Date enumeration tests
- [x] Session bucketing tests
- [x] Timezone handling tests

### ⏳ Manual Tests (After Deployment)

1. **Test: October 2025 Matrix**
   ```
   Expected: Headers show 01-OCT through 31-OCT
   Expected: NO 30-SEPT column
   Expected: NO 01-NOV column
   ```

2. **Test: Day Modal for Non-Zero Day**
   ```
   Step 1: Click cell showing "8.5 hours"
   Expected: Modal opens
   Expected: Shows list of sessions (e.g., 2 sessions)
   Expected: Total in modal = 8.5 hours (matches cell)
   ```

3. **Test: Late Night Session**
   ```
   Given: Session at 23:00 on Sept 30 (local)
   When: View October matrix
   Then: Session should NOT appear in Oct 1
   When: View September matrix  
   Then: Session SHOULD appear in Sept 30
   ```

---

## Deployment Workflow

```
┌─────────────────────────────────────────────────────┐
│ 1. Apply Database Migration                        │
│    psql $DATABASE_URL -f migration.sql              │
│    → Creates new view definition                    │
│    → Zero downtime (view replacement)               │
└──────────────────┬──────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│ 2. Deploy Application Code (this PR)               │
│    → API endpoints use new view                     │
│    → Data layer queries simplified                  │
│    → UI unchanged (already compatible)              │
└──────────────────┬──────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│ 3. Verify in Production                            │
│    → Check October matrix (no Sept 30)             │
│    → Test day modals (show sessions)               │
│    → Verify totals match                           │
└─────────────────────────────────────────────────────┘
```

---

## Rollback Plan

If issues arise:

```bash
# Option 1: Revert application code only
git revert <this-pr-commit>

# Option 2: Update view again with fix
psql $DATABASE_URL -f db/migrations/new_fix.sql

# Option 3: Drop view and recreate (if needed)
psql $DATABASE_URL -c "DROP VIEW IF EXISTS public.staff_day_sessions_v;"
# Then apply corrected migration
```

**Note:** View changes are non-destructive and can be updated anytime.
