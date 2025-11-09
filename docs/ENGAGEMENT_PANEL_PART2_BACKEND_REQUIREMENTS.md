# MD-Clean Engagement Panel Part 2/2 — Backend Requirements

This document outlines the additional database views required to support Part 2/2 of the MD-Clean Engagement Panel implementation (Modules 11-20).

## Overview

Part 2/2 adds student-level insights, deep-dive metrics, and cross-panel alignment. All views are in the `mgmt` schema, read-only, using timezone **America/Guayaquil**.

---

## Section D — Student-Level Engagement Insights

### Module 11: `mgmt.engagement_inactive_roster_v`

**Purpose:** Complete roster of students with inactivity status.

**Columns:**
- `student_id` (integer) - Student identifier
- `full_name` (text) - Student full name
- `level` (text, nullable) - Current level
- `last_checkin_time` (timestamptz, nullable) - Last check-in timestamp
- `days_since_last_checkin` (numeric, nullable) - Days since last activity
- `inactivity_bucket` (text) - One of: `'inactive_7d'`, `'inactive_14d'`, `'dormant_30d'`, `'long_term_inactive_180d'`, `'active_recent'`

**Business Logic:**
```sql
-- Pseudo-logic for inactivity_bucket:
CASE
  WHEN days_since_last_checkin IS NULL THEN 'active_recent'
  WHEN days_since_last_checkin >= 180 THEN 'long_term_inactive_180d'
  WHEN days_since_last_checkin >= 30 THEN 'dormant_30d'
  WHEN days_since_last_checkin >= 14 THEN 'inactive_14d'
  WHEN days_since_last_checkin >= 7 THEN 'inactive_7d'
  ELSE 'active_recent'
END
```

**Returns:** All students (no limit), ordered by `days_since_last_checkin DESC`

---

### Module 12 & 14: `mgmt.engagement_student_activity_v`

**Purpose:** Student-level metrics for at-risk and high-engagement identification.

**Columns:**
- `student_id` (integer)
- `full_name` (text, nullable)
- `level` (text, nullable)
- `sessions_30d` (integer) - Number of sessions in last 30 days
- `avg_days_between_visits` (numeric, nullable) - Average gap between visits
- `days_since_last_checkin` (numeric, nullable) - Days since last activity
- `consistency_score` (numeric, nullable) - 0-100 score (higher = more consistent)

**Consistency Score Logic:**
- Combine frequency (sessions_30d) and recency (days_since_last_checkin)
- Example formula: `100 * (sessions_30d / 30) * (1 / (1 + days_since_last_checkin / 7))`
- Normalize to 0-100 range
- Students with >= 85 score are "Embajador potencial" candidates

**Returns:** All active students, ordered by `days_since_last_checkin DESC, consistency_score DESC`

**Frontend Processing:**
- **At-Risk Students:** Filter where `days_since_last_checkin >= 7`, take top 50
- **High-Engagement Students:** Filter where `sessions_30d >= 5 AND consistency_score >= 60`, take top 50

---

### Module 13: `mgmt.engagement_recent_reactivated_14d_v`

**Purpose:** Students who returned after 14+ days of inactivity.

**Columns:**
- `student_id` (integer)
- `full_name` (text, nullable)
- `days_inactive_before_return` (integer) - Days they were inactive before returning
- `return_date` (date) - Date of their return check-in

**Business Logic:**
- Detect students with a gap >= 14 days between two consecutive check-ins
- Return check-in must be within last 14 days from now()
- Show most recent reactivations first

**Implementation Approach:**
```sql
-- Identify gaps using LAG window function
WITH gaps AS (
  SELECT 
    student_id,
    checkin_time,
    LAG(checkin_time) OVER (PARTITION BY student_id ORDER BY checkin_time) AS prev_checkin,
    EXTRACT(EPOCH FROM (checkin_time - LAG(checkin_time) OVER (PARTITION BY student_id ORDER BY checkin_time)))/86400 AS days_gap
  FROM public.student_attendance
  WHERE checkin_time >= now() - interval '90 days'
)
SELECT student_id, full_name, days_gap AS days_inactive_before_return, checkin_time::date AS return_date
FROM gaps
JOIN public.students USING (student_id)
WHERE days_gap >= 14 
  AND checkin_time >= now() - interval '14 days'
ORDER BY checkin_time DESC;
```

**Returns:** Recent reactivations (last 14 days), ordered by `return_date DESC`

---

## Section E — Deep-Dive Engagement Metrics

### Module 15: `mgmt.engagement_session_frequency_30d_v`

**Purpose:** Histogram of session counts per student (last 30 days).

**Columns:**
- `bin_label` (text) - One of: `'0'`, `'1'`, `'2'`, `'3'`, `'4'`, `'5'`, `'6-7'`, `'8-10'`, `'11+'`
- `student_count` (integer) - Number of students in this bin

**Business Logic:**
```sql
-- Count sessions per student, then bucket
WITH session_counts AS (
  SELECT student_id, COUNT(*) AS session_count
  FROM public.student_attendance
  WHERE checkin_time >= now() - interval '30 days'
  GROUP BY student_id
)
SELECT 
  CASE 
    WHEN session_count = 0 THEN '0'
    WHEN session_count = 1 THEN '1'
    WHEN session_count = 2 THEN '2'
    WHEN session_count = 3 THEN '3'
    WHEN session_count = 4 THEN '4'
    WHEN session_count = 5 THEN '5'
    WHEN session_count BETWEEN 6 AND 7 THEN '6-7'
    WHEN session_count BETWEEN 8 AND 10 THEN '8-10'
    ELSE '11+'
  END AS bin_label,
  COUNT(*) AS student_count
FROM session_counts
GROUP BY bin_label
ORDER BY 
  CASE bin_label
    WHEN '0' THEN 0
    WHEN '1' THEN 1
    WHEN '2' THEN 2
    WHEN '3' THEN 3
    WHEN '4' THEN 4
    WHEN '5' THEN 5
    WHEN '6-7' THEN 6
    WHEN '8-10' THEN 8
    ELSE 11
  END;
```

**Returns:** 9 rows (one per bin), ordered by bin sequence

---

### Module 16: Attendance Concentration by Day of Week

**Uses existing view:** `mgmt.engagement_dau_90d_v`

Frontend aggregates `total_minutes` by ISO weekday (extracted from `d` column).

**No new view needed.**

---

### Module 17: `mgmt.engagement_daypart_retention_v`

**Purpose:** Return rate by daypart (students who repeat same time window).

**Columns:**
- `daypart` (text) - One of: `'morning_08_12'`, `'afternoon_12_17'`, `'evening_17_20'`
- `return_rate` (numeric, 0-1) - Percentage of students who returned >= 2 times in same daypart

**Business Logic:**
```sql
-- For each daypart, count distinct students with >= 2 visits in that daypart (last 30 days)
-- Return rate = students_with_2+_visits / total_distinct_students_in_daypart

WITH daypart_visits AS (
  SELECT 
    student_id,
    CASE 
      WHEN EXTRACT(HOUR FROM checkin_time AT TIME ZONE 'America/Guayaquil') BETWEEN 8 AND 11 THEN 'morning_08_12'
      WHEN EXTRACT(HOUR FROM checkin_time AT TIME ZONE 'America/Guayaquil') BETWEEN 12 AND 16 THEN 'afternoon_12_17'
      WHEN EXTRACT(HOUR FROM checkin_time AT TIME ZONE 'America/Guayaquil') BETWEEN 17 AND 19 THEN 'evening_17_20'
    END AS daypart,
    COUNT(*) AS visit_count
  FROM public.student_attendance
  WHERE checkin_time >= now() - interval '30 days'
    AND EXTRACT(HOUR FROM checkin_time AT TIME ZONE 'America/Guayaquil') BETWEEN 8 AND 19
  GROUP BY student_id, daypart
)
SELECT 
  daypart,
  COUNT(CASE WHEN visit_count >= 2 THEN 1 END)::numeric / NULLIF(COUNT(*), 0) AS return_rate
FROM daypart_visits
GROUP BY daypart;
```

**Returns:** 3 rows (one per daypart)

---

### Module 18: Session Length Distribution (OMITTED)

Per specification note, this module is optional and has been omitted from the initial implementation.

---

## Section F — Cross-Panel Alignment

### Module 19: `mgmt.engagement_dual_risk_students_v`

**Purpose:** Students appearing on both Engagement and Learning concern lists.

**Columns:**
- `student_id` (integer)
- `full_name` (text, nullable)
- `level` (text, nullable)
- `engagement_issue` (text) - Description, e.g., "30+ días sin visitar"
- `learning_issue` (text) - Description, e.g., "Slow" or "Stalled"
- `days_since_last_checkin` (numeric, nullable)

**Business Logic:**
```sql
-- Join engagement inactive roster with learning at-risk tables
SELECT DISTINCT
  e.student_id,
  s.full_name,
  s.level,
  CASE 
    WHEN e.days_since_last_checkin >= 180 THEN '180+ días'
    WHEN e.days_since_last_checkin >= 30 THEN '30+ días'
    WHEN e.days_since_last_checkin >= 14 THEN '14+ días'
    WHEN e.days_since_last_checkin >= 7 THEN '7+ días'
    ELSE 'Baja actividad'
  END AS engagement_issue,
  CASE
    WHEN l.stuck_flag THEN 'Stalled'
    WHEN l.slow_flag THEN 'Slow'
    ELSE 'At risk'
  END AS learning_issue,
  e.days_since_last_checkin
FROM mgmt.engagement_inactive_roster_v e
JOIN mgmt.learning_at_risk_learners_v l USING (student_id)
JOIN public.students s USING (student_id)
WHERE e.inactivity_bucket IN ('inactive_14d', 'dormant_30d', 'long_term_inactive_180d')
ORDER BY e.days_since_last_checkin DESC NULLS LAST;
```

**Dependencies:**
- `mgmt.engagement_inactive_roster_v` (Module 11)
- `mgmt.learning_at_risk_learners_v` (from Learning Panel)
- `mgmt.learning_stuck_students_v` (optional, from Learning Panel)

**Returns:** Students with dual risk, ordered by `days_since_last_checkin DESC`

---

### Module 20: Export + Manager Action Notes

**No backend view required.** This is a frontend-only feature that exports existing data to CSV.

---

## Summary of New Views (Part 2/2)

| # | View Name | Module | Rows |
|---|-----------|--------|------|
| 1 | `mgmt.engagement_inactive_roster_v` | 11 | All students |
| 2 | `mgmt.engagement_student_activity_v` | 12, 14 | All active students |
| 3 | `mgmt.engagement_recent_reactivated_14d_v` | 13 | Recent reactivations |
| 4 | `mgmt.engagement_session_frequency_30d_v` | 15 | 9 bins |
| 5 | `mgmt.engagement_daypart_retention_v` | 17 | 3 dayparts |
| 6 | `mgmt.engagement_dual_risk_students_v` | 19 | Variable |

**Total Part 2/2:** 6 new views

**Total All Parts:** 17 views (11 from Part 1/2 + 6 from Part 2/2)

---

## Data Freshness

All views should reflect real-time data as of `now()` unless otherwise specified. No filters are applied at the application level.

---

## Timezone Handling (Reminder)

All timestamp evaluations use **America/Guayaquil**:

```sql
-- Extract hour in Guayaquil timezone
EXTRACT(HOUR FROM timestamp AT TIME ZONE 'America/Guayaquil')

-- Extract ISO weekday (1=Mon, 7=Sun)
EXTRACT(ISODOW FROM timestamp AT TIME ZONE 'America/Guayaquil')

-- Date truncation
DATE(timestamp AT TIME ZONE 'America/Guayaquil')
```

---

## Implementation Priority

**High Priority (Core functionality):**
1. `engagement_inactive_roster_v` (Module 11)
2. `engagement_student_activity_v` (Modules 12 & 14)
3. `engagement_dual_risk_students_v` (Module 19)

**Medium Priority (Analytics):**
4. `engagement_session_frequency_30d_v` (Module 15)
5. `engagement_daypart_retention_v` (Module 17)

**Low Priority (Nice to have):**
6. `engagement_recent_reactivated_14d_v` (Module 13)

---

## Next Steps

1. Backend team creates the 6 new views
2. Verify column names and data types match specification
3. Test with real data in staging
4. Deploy to production
5. Monitor query performance (all views should complete < 200ms)

---

**Frontend Status:** ✅ COMPLETE (20 modules implemented)

**Backend Status:** ⏳ PENDING (17 views total, 6 new in Part 2/2)
