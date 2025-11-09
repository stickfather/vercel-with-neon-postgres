# MD-Clean Engagement Panel - Backend Requirements

This document outlines the database views required to support the MD-Clean Engagement Panel implementation.

## Overview

The Engagement Panel queries data from `mgmt.*` schema views. These views are **read-only** and provide aggregated metrics. All queries use timezone **America/Guayaquil**.

---

## Required Views

### Section A — Core Engagement KPIs

#### 1. `mgmt.engagement_active_counts_v`
**Purpose:** Provides active user counts at different time horizons.

**Columns:**
- `active_7d` (integer) - Distinct students with ≥1 check-in in last 7 days
- `active_14d` (integer) - Distinct students with ≥1 check-in in last 14 days
- `active_30d` (integer) - Distinct students with ≥1 check-in in last 30 days
- `active_6mo` (integer) - Distinct students with ≥1 check-in in last 180 days

**Returns:** 1 row

---

#### 2. `mgmt.engagement_inactive_counts_v`
**Purpose:** Quantifies disengagement by recency buckets.

**Columns:**
- `inactive_7d_count` (integer) - Students with no check-in for 7+ days
- `inactive_14d_count` (integer) - Students with no check-in for 14+ days
- `dormant_30d_count` (integer) - Students with no check-in for 30+ days
- `inactive_180d_count` (integer) - Students with no check-in for 180+ days

**Returns:** 1 row

---

#### 3. `mgmt.engagement_wau_mau_v`
**Purpose:** Weekly and monthly active user metrics with stickiness ratio.

**Columns:**
- `wau` (integer) - Weekly active users (last 7 days)
- `mau` (integer) - Monthly active users (last 30 days)
- `wau_mau_ratio` (numeric, 0-1) - WAU/MAU ratio (stickiness metric)

**Returns:** 1 row

---

#### 4. `mgmt.engagement_avg_days_between_visits_v`
**Purpose:** Average days between student visits (existing view).

**Columns:**
- `scope` (text) - 'GLOBAL' or 'LEVEL'
- `level` (text) - Level name (null for GLOBAL)
- `avg_days_between_visits` (numeric) - Average gap in days

**Returns:** Multiple rows (1 GLOBAL + N LEVEL rows)

---

#### 5. `mgmt.engagement_median_days_between_visits_v`
**Purpose:** Median days between visits (resistant to outliers).

**Columns:**
- `median_days_between_visits` (numeric) - Median gap in days

**Returns:** 1 row

**Implementation Note:** Use `PERCENTILE_CONT(0.5)` for median calculation.

---

### Section B — Engagement Trends

#### 6. `mgmt.engagement_decline_index_v`
**Purpose:** Week-over-week comparison (existing view, referenced in spec as Module 6).

**Columns:**
- `active_students_7d` (integer) - Current 7-day active count
- `active_students_prev7d` (integer) - Previous 7-day active count
- `active_students_wow_change` (numeric) - Relative change (-1..+inf)
- `total_minutes_7d` (integer) - Current 7-day minutes
- `total_minutes_prev7d` (integer) - Previous 7-day minutes
- `total_minutes_wow_change` (numeric) - Relative change (-1..+inf)

**Returns:** 1 row

---

#### 7. `mgmt.engagement_weekly_active_90d_v`
**Purpose:** Weekly engagement metrics over 90 days (12-14 weeks).

**Columns:**
- `week_start` (date) - Monday of the week
- `max_daily_actives` (integer) - Peak daily active users in that week
- `total_minutes` (integer) - Sum of all minutes in that week
- `sessions` (integer) - Total sessions in that week
- `sum_active_students` (integer) - Sum of daily active students (for reference)

**Returns:** ~12-14 rows (last 90 days, grouped by week)

**Note:** Week starts on Monday (ISO week).

---

#### 8. `mgmt.engagement_mau_rolling_90d_v`
**Purpose:** Rolling 30-day active cohort size, evaluated daily.

**Columns:**
- `snapshot_date` (date) - Evaluation date
- `mau_rolling_30d` (integer) - Distinct students with ≥1 check-in in the 30 days before snapshot_date

**Returns:** 90 rows (1 per day in last 90 days)

**Implementation Note:** This requires distinct-set logic. For each `snapshot_date`, count distinct students with check-ins in `[snapshot_date - 30 days, snapshot_date)`.

---

### Section C — Time Distribution

#### 9. `mgmt.engagement_hour_split_v`
**Purpose:** Distribution of minutes across dayparts (existing view).

**Columns:**
- `daypart` (text) - One of: 'morning_08_12', 'afternoon_12_17', 'evening_17_20'
- `total_minutes` (numeric) - Sum of minutes in that daypart

**Returns:** 3 rows

---

#### 10. `mgmt.engagement_hourly_heatmap_90d_v`
**Purpose:** Demand by weekday × hour for heatmap visualization.

**Columns:**
- `iso_weekday` (integer, 1-7) - ISO weekday (1=Monday, 7=Sunday)
- `hour_local` (integer, 0-23) - Hour in America/Guayaquil timezone
- `minutes` (integer) - Total minutes for that weekday-hour combination (last 90 days)

**Returns:** Up to 7 × 24 = 168 rows (may have fewer if some cells have no data)

**Implementation Note:** 
- Use `EXTRACT(ISODOW FROM timestamp AT TIME ZONE 'America/Guayaquil')` for weekday
- Use `EXTRACT(HOUR FROM timestamp AT TIME ZONE 'America/Guayaquil')` for hour
- For the spec, filter to hours 8-20 (inclusive), but the view can return all 24 hours

---

#### 11. `mgmt.engagement_dau_90d_v`
**Purpose:** Daily activity for last 90 days (used for weekday traffic aggregation).

**Columns:**
- `d` (date) - Activity date
- `active_students` (integer) - Distinct students with check-ins on that date
- `total_minutes` (numeric) - Total minutes on that date

**Returns:** 90 rows (1 per day)

**Note:** The frontend will aggregate by weekday (Mon-Sun) and compute percentages.

---

## Legacy Views (Keep for Compatibility)

These views are currently used by the old implementation and should remain:

- `mgmt.engagement_daily_activity_v` - May be same as `engagement_dau_90d_v`
- `mgmt.engagement_inactive_roster_v` - For drill-down into inactive students

---

## Timezone Handling

All timestamp columns should be evaluated in **America/Guayaquil** timezone:

```sql
-- Example: convert timestamp to Guayaquil timezone
timestamp AT TIME ZONE 'America/Guayaquil'

-- Extract hour in Guayaquil timezone
EXTRACT(HOUR FROM timestamp AT TIME ZONE 'America/Guayaquil')

-- Extract ISO weekday (1=Mon, 7=Sun)
EXTRACT(ISODOW FROM timestamp AT TIME ZONE 'America/Guayaquil')
```

---

## Data Freshness

Views should reflect real-time data as of `now()` unless otherwise specified. No filters are applied at the application level.

---

## Next Steps

1. Backend team creates/updates the required views in `mgmt` schema
2. Verify view output matches expected columns and data types
3. Deploy and test with real data
4. Adjust frontend formatting/calculations if needed

---

## Frontend Implementation Status

✅ All 10 modules implemented
✅ TypeScript types defined
✅ Spanish labels (casual tone)
✅ DT-ES formatting with date-fns
✅ ES-Short weekday labels
✅ America/Guayaquil timezone in display
✅ Visual style matches Exams/Learning panels

**Pending:** Backend views creation/validation
