# 🧾 SALC App — Payroll Matrix API & Frontend Integration Guide

**Version:** October 2025  
**Purpose:** Defines how the front-end communicates with NeonDB to drive the staff payroll matrix, session editing, and approval system.

---

## 📊 Overview

The Payroll Matrix has two main UI layers:

1. **Matrix View** — the orange grid showing total and approved hours per staff per day.
2. **Day Drawer (Detail View)** — the modal for editing, adding, deleting sessions, and approving days.

All data flows through SQL views and functions in Neon.  
This document defines the endpoints (SQL functions/views), when to call them, and what to expect in return.

---

## 1️⃣ MATRIX VIEW

### 🔍 Data Source

```sql
SELECT
  m.staff_id,
  m.work_date,
  m.total_hours,
  m.approved_hours,
  m.horas_mostrar,
  m.approved,
  COALESCE(e.has_edits, false) AS has_edits
FROM public.staff_day_matrix_local_v m
LEFT JOIN public.staff_day_has_edits_v e
  ON e.staff_id = m.staff_id
 AND e.work_date = m.work_date
ORDER BY m.staff_id, m.work_date;
```

### 🎨 Color Logic (Frontend)

| Color     | Meaning                       | Condition                                    |
| --------- | ----------------------------- | -------------------------------------------- |
| 🟠 Orange | Pendiente (Pending)           | `approved = false AND edited = false`        |
| 🟢 Green  | Aprobado (Approved)           | `approved = true AND edited = false`         |
| 🟡 Yellow | Editado y aprobado            | `approved = true AND edited = true`          |
| 🟣 Purple | Editado sin aprobar           | `approved = false AND edited = true`         |

**Note:** The `edited` field indicates if any edits have been made to the sessions for that day, regardless of when the edits occurred. Green is ONLY shown when a day is approved AND has never been edited.

### 🧮 Optional Filtering

```sql
WHERE m.work_date BETWEEN $start::date AND $end::date
  AND m.staff_id = ANY($staff_ids::bigint[])
```

---

## 2️⃣ DAY DRAWER (DETAIL VIEW)

### 🔍 Load Day Sessions

```sql
SELECT *
FROM public.staff_day_sessions_with_edits_v
WHERE staff_id = $1
  AND work_date = $2
ORDER BY checkin_local;
```

### 🧮 Load Day Totals

```sql
SELECT total_hours
FROM public.staff_day_totals_v
WHERE staff_id = $1 AND work_date = $2;
```

### 💡 Display Logic

* **checkin_local / checkout_local** → current active times
* **original_checkin_local / original_checkout_local** → shown in yellow box (“ORIGINAL”)
* **was_edited = true** → show “EDITADA” badge
* **edit_note / edited_by_staff_id** → show who made the change and why

When a session is edited, added, or deleted, the day stays approved but is visually marked as **Edited + Approved (🟡)**.

---

## 3️⃣ ACTIONS (SQL FUNCTIONS)

### ✏️ Edit Session

```sql
SELECT public.edit_staff_session(
  $session_id::bigint,
  $editor_staff_id::bigint,
  $new_checkin_local::text,   -- '2025-10-20 08:00'
  $new_checkout_local::text,  -- '2025-10-20 16:00'
  $note::text
);
```

✅ Updates `staff_attendance`
✅ Logs audit event in `payroll_audit_events`
✅ Keeps day approved but flags as edited (🟡)

---

### ➕ Add Session

```sql
SELECT public.add_staff_session(
  $staff_id::bigint,
  $checkin_local::text,    -- '2025-10-20 09:00'
  $checkout_local::text,   -- '2025-10-20 13:00'
  $editor_staff_id::bigint,
  $note::text
);
```

✅ Inserts new session
✅ Logs `add_session` audit
✅ Keeps the day approved automatically

---

### ❌ Delete Session

```sql
SELECT public.delete_staff_session(
  $session_id::bigint,
  $editor_staff_id::bigint,
  $note::text
);
```

✅ Removes session
✅ Logs `delete_session` audit
✅ Keeps the day approved automatically

---

### ✅ Approve Day

```sql
SELECT public.approve_staff_day(
  $staff_id::bigint,
  $work_date::date,
  $approved_by::text,        -- e.g. 'manager@salc.ec'
  $minutes_override::integer -- NULL or manual minutes override
);
```

✅ Writes to `payroll_day_approvals`
✅ Updates totals and status in `staff_day_matrix_local_v`
✅ Sets color 🟢 (or 🟡 if edited later)

---

### 🔁 Revoke Approval

```sql
SELECT public.revoke_staff_day_approval(
  $staff_id::bigint,
  $work_date::date
);
```

✅ Unlocks the day for further edits
✅ Resets color to 🟠 Pending
✅ Any new edit or addition will automatically re-approve the day

---

## 4️⃣ REFRESH RULES

| Action          | Refresh Drawer | Refresh Matrix | Notes                                         |
| --------------- | -------------- | -------------- | --------------------------------------------- |
| Add Session     | ✅              | ✅              | Totals update and day stays approved (🟡)     |
| Edit Session    | ✅              | ✅              | Updates times, re-approved automatically (🟡) |
| Delete Session  | ✅              | ✅              | Totals recalc, re-approved automatically (🟡) |
| Approve Day     | ✅              | ✅              | Locks totals (🟢)                             |
| Revoke Approval | ✅              | ✅              | Unlocks for edits (🟠)                        |

All data is from **live SQL views** — UI updates instantly without cron jobs.

---

## 5️⃣ PAYROLL TOTALS (Right Column)

For “Monto Aprobado”:

```sql
SELECT
  staff_id,
  SUM(ROUND(approved_minutes::numeric / 60.0 * hourly_rate, 2)) AS monto_aprobado
FROM payroll_day_approvals
JOIN staff_members USING (staff_id)
WHERE approved = true
GROUP BY staff_id;
```

Or compute in frontend:

```js
approved_hours * hourly_rate
```

---

## 6️⃣ FRONTEND STATE SUMMARY

| UI Element          | SQL Source                                               | Description                                 |
| ------------------- | -------------------------------------------------------- | ------------------------------------------- |
| Payroll Matrix Grid | `staff_day_matrix_local_v` + `staff_day_has_edits_v`     | Shows all staff, dates, and approval status |
| Day Drawer          | `staff_day_sessions_with_edits_v` + `staff_day_totals_v` | Displays editable sessions and totals       |
| Add Session         | `add_staff_session()`                                    | Inserts a manual punch                      |
| Edit Session        | `edit_staff_session()`                                   | Adjusts existing times and flags as edited  |
| Delete Session      | `delete_staff_session()`                                 | Removes record and flags as edited          |
| Approve Day         | `approve_staff_day()`                                    | Locks totals and marks as approved          |
| Revoke Approval     | `revoke_staff_day_approval()`                            | Unlocks the day for editing again           |

---

## 7️⃣ LOCAL TIME CONSISTENCY

All functions and views use:

```sql
timezone('America/Guayaquil', timestamp_column)
```

✅ Prevents UTC offset issues
✅ Ensures all times match Ecuador’s local time

---

## ✅ SUMMARY

* The matrix and drawer are **live views** (no refresh needed).
* Every change (add/edit/delete) **auto-approves** the day and marks it as edited (🟡).
* Manual approval and revocation still exist for manager control.
* The color logic clearly reflects state transitions:

  * 🟠 Pending (not approved, no edits)
  * 🟣 Edited without approval (has edits, not yet approved)
  * 🟢 Approved (approved, no edits)
  * 🟡 Edited after approval (approved and edited)

---

**Maintained by:** SALC Development Team
**Database:** Neon Postgres
**Timezone:** `America/Guayaquil`
