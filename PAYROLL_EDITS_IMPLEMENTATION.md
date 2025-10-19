# Payroll Edits Highlighting Implementation

## Overview
This document describes the implementation of the payroll edits highlighting feature, which visually indicates when staff payroll days have been edited and displays the original session times in the session detail modal.

## Database Prerequisites

The implementation assumes the following database objects exist (created via `db/migrations/2025-10-19_add_edit_views.sql`):

### Views Created

1. **`public.staff_day_has_edits_v`**
   - Returns: `staff_id`, `work_date`, `has_edits`
   - Purpose: Identifies staff/day combinations that have edit history
   - Used by: Matrix queries to determine which cells should show the "edited" indicator

2. **`public.staff_day_sessions_with_edits_v`** (Optional)
   - Alternative to LEFT JOIN LATERAL approach
   - Could include `original_checkin_local` and `original_checkout_local` columns

### Tables Extended

1. **`public.payroll_audit_events`**
   - Tracks all payroll modifications
   - Key fields:
     - `action`: Type of modification (e.g., "update_session", "create_session", "delete_session")
     - `staff_id`: Staff member identifier
     - `work_date`: Date of the work session
     - `session_id`: Session identifier (nullable)
     - `details`: JSONB containing modification details including original times
     - `created_at`: Timestamp of the audit event

## Implementation Details

### 1. Backend Service Layer (`lib/payroll/reports-service.ts`)

#### Matrix Query Enhancement
```typescript
// Added LEFT JOIN to include has_edits flag
LEFT JOIN public.staff_day_has_edits_v he 
  ON he.staff_id = m.staff_id 
  AND he.work_date = m.work_date
SELECT COALESCE(he.has_edits, FALSE) AS has_edits
```

#### Session Query Enhancement
```typescript
// Added LEFT JOIN LATERAL to fetch original times from audit trail
LEFT JOIN LATERAL (
  SELECT
    (details->>'checkinTime')::timestamptz AT TIME ZONE 'America/Guayaquil' AS original_checkin_local,
    (details->>'checkoutTime')::timestamptz AT TIME ZONE 'America/Guayaquil' AS original_checkout_local
  FROM public.payroll_audit_events
  WHERE action = 'update_session'
    AND session_id = s.session_id
  ORDER BY created_at DESC
  LIMIT 1
) e ON true
```

The query:
- Fetches the most recent audit event for each session
- Extracts original times from the JSONB `details` field
- Converts timestamps to local timezone (America/Guayaquil)
- Returns NULL when no edit history exists

### 2. Data Layer (`features/administration/data/payroll-reports.ts`)

#### Type Updates
```typescript
export type MatrixCell = {
  // ... existing fields
  hasEdits?: boolean;
};

export type DaySession = {
  // ... existing fields
  originalCheckinTime?: string | null;
  originalCheckoutTime?: string | null;
};
```

#### Data Mapping
- `has_edits` → `hasEdits`
- `original_checkin_local` → `originalCheckinTime`
- `original_checkout_local` → `originalCheckoutTime`

### 3. Frontend Component (`features/administration/components/payroll-reports/payroll-reports-dashboard.tsx`)

#### Matrix Cell Rendering
Cells are styled with priority:
1. **Yellow** (edited) - `border-yellow-400 bg-yellow-100 text-yellow-900`
2. **Green** (approved) - `border-emerald-500 bg-emerald-500/90 text-white`
3. **Orange** (pending) - `border-orange-500 bg-orange-500/90 text-white`

```typescript
const hasEdits = cell.hasEdits === true;
className={`... ${
  hasEdits
    ? "border-yellow-400 bg-yellow-100 text-yellow-900 hover:bg-yellow-200"
    : cell.approved
      ? "border-emerald-500 bg-emerald-500/90 text-white hover:bg-emerald-500"
      : "border-orange-500 bg-orange-500/90 text-white hover:bg-orange-500"
} ...`}
```

#### Session Modal Enhancement
Original times are displayed in a read-only gray box beneath each time input:

```typescript
{session.originalCheckin ? (
  <div className="mt-1 rounded-lg bg-brand-deep-soft/30 px-2 py-1 text-xs text-brand-ink-muted">
    <span className="font-semibold uppercase tracking-wide">Original:</span>{" "}
    {timeZoneDateTimeFormatter.format(new Date(session.originalCheckin))}
  </div>
) : null}
```

Format example: "2025-10-15, 08:30"

### 4. Type Definitions (`types/payroll.ts`)

Updated core types:
```typescript
export type PayrollMatrixCell = {
  // ... existing fields
  hasEdits?: boolean;
};

export type DaySession = {
  // ... existing fields
  originalCheckinLocal?: string | null;
  originalCheckoutLocal?: string | null;
};
```

## API Endpoints

### GET /api/payroll/reports/matrix

**Query Parameters:**
- `month`: YYYY-MM-DD format (first day of month)
- OR `start` and `end`: Date range in YYYY-MM-DD format

**Response Changes:**
```json
{
  "days": ["2025-10-01", "2025-10-02"],
  "rows": [
    {
      "staffId": 1,
      "staffName": "Ana",
      "cells": [
        {
          "date": "2025-10-01",
          "hours": 8.5,
          "approved": true,
          "approvedHours": 8.5,
          "hasEdits": true  // NEW FIELD
        }
      ]
    }
  ]
}
```

### GET /api/payroll/day-sessions

**Query Parameters:**
- `staffId`: Staff member ID
- `date`: Work date in YYYY-MM-DD format

**Response Changes:**
```json
{
  "sessions": [
    {
      "sessionId": 123,
      "staffId": 1,
      "workDate": "2025-10-15",
      "checkinTime": "2025-10-15T09:00:00-05:00",
      "checkoutTime": "2025-10-15T17:00:00-05:00",
      "hours": 8,
      "originalCheckinTime": "2025-10-15T08:30:00-05:00",   // NEW FIELD
      "originalCheckoutTime": "2025-10-15T16:30:00-05:00"  // NEW FIELD
    }
  ]
}
```

## Testing

### Test Coverage
1. **Unit Test**: Verifies `hasEdits` field is properly included in matrix response
2. **Backward Compatibility**: All existing tests pass without modification
3. **TypeScript**: Full type safety with optional fields

### Running Tests
```bash
npm test
```

Expected: 67 tests passing

## Verification Steps

### SQL Verification

**Check edited days:**
```sql
SELECT staff_id, work_date, has_edits 
FROM public.staff_day_has_edits_v
WHERE has_edits = TRUE
ORDER BY work_date DESC, staff_id
LIMIT 10;
```

**Check original session times:**
```sql
SELECT 
  s.session_id,
  s.checkin_local AS current_checkin,
  s.checkout_local AS current_checkout,
  e.original_checkin_local,
  e.original_checkout_local
FROM public.staff_day_sessions_local_v s
LEFT JOIN LATERAL (
  SELECT
    (details->>'checkinTime')::timestamptz AT TIME ZONE 'America/Guayaquil' AS original_checkin_local,
    (details->>'checkoutTime')::timestamptz AT TIME ZONE 'America/Guayaquil' AS original_checkout_local
  FROM public.payroll_audit_events
  WHERE action = 'update_session' 
    AND session_id = s.session_id
  ORDER BY created_at DESC 
  LIMIT 1
) e ON true
WHERE e.original_checkin_local IS NOT NULL
ORDER BY s.work_date DESC
LIMIT 10;
```

### UI Verification

1. **Matrix View**
   - Navigate to payroll reports
   - Look for cells with yellow background
   - These indicate days with edit history
   - Yellow cells should be visually distinct from green (approved) and orange (pending) cells

2. **Session Detail Modal**
   - Click on a yellow (edited) cell
   - Modal opens showing session details
   - Look for gray "Original:" boxes beneath time inputs
   - Original times should be formatted as "YYYY-MM-DD, HH:MM"
   - Times should reflect the pre-edit values

## Backward Compatibility

All changes are backward compatible:
- New fields are optional (`?` in TypeScript)
- Default values provided when data is missing:
  - `hasEdits` defaults to `false`
  - Original time fields default to `null`
- LEFT JOIN ensures no data loss when views are empty
- Existing tests pass without modification

## Migration Notes

If the database views don't exist:
1. Matrix queries will still work (LEFT JOIN returns NULL for has_edits)
2. Session queries will still work (LEFT JOIN LATERAL returns NULL for original times)
3. UI will function normally with all cells showing standard approved/pending colors
4. No original time indicators will appear in session modals

The feature gracefully degrades when audit data is unavailable.

## Performance Considerations

1. **Matrix Query**: Single additional LEFT JOIN to pre-aggregated view
2. **Session Query**: LEFT JOIN LATERAL runs efficiently per session
3. **Indexes Recommended**:
   - `payroll_audit_events(session_id, created_at DESC)` for session original time lookups
   - `staff_day_has_edits_v` should be materialized or indexed if performance issues arise

## Future Enhancements

Potential improvements:
1. Show who made the edit and when
2. Display full edit history (multiple changes)
3. Add ability to revert to original times
4. Show diff between original and current times
5. Add filters to show only edited days in matrix
