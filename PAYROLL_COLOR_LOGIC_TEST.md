# Payroll Matrix Cell Color Logic - Test Cases

## Color Rules

The payroll matrix cells follow these exact color rules:

1. **Orange (Pendiente)**: `approved = false AND edited = false`
2. **Green (Aprobado)**: `approved = true AND edited = false`
3. **Yellow (Editado y aprobado)**: `approved = true AND edited = true`
4. **Purple (Editado sin aprobar)**: `approved = false AND edited = true`

## Test Cases

### Test Case 1: Orange - Pending Session
```javascript
{
  approved: false,
  edited: false,
  hours: 8.0
}
```
**Expected Result:** 🟠 Orange (Pendiente)
**Reason:** Session exists but has not been approved and has not been edited

### Test Case 2: Green - Approved Session
```javascript
{
  approved: true,
  edited: false,
  hours: 8.0,
  approvedHours: 8.0
}
```
**Expected Result:** 🟢 Green (Aprobado)
**Reason:** Session is approved and has never been edited

### Test Case 3: Yellow - Approved and Edited Session
```javascript
{
  approved: true,
  edited: true,
  hours: 8.5,
  approvedHours: 8.5
}
```
**Expected Result:** 🟡 Yellow (Editado y aprobado)
**Reason:** Session is approved and has been edited (times were adjusted after original entry)

### Test Case 4: Purple - Edited but Not Approved
```javascript
{
  approved: false,
  edited: true,
  hours: 7.5
}
```
**Expected Result:** 🟣 Purple (Editado sin aprobar)
**Reason:** Session has been edited but approval has been revoked or not yet granted

## Implementation Details

### Backend (`features/administration/data/payroll-reports.ts`)

The `resolveDayStatus` function implements these rules:

```typescript
function resolveDayStatus(
  approved: boolean,
  edited: boolean,
): PayrollDayStatus {
  if (approved && edited) {
    return "edited_and_approved";
  }
  if (approved && !edited) {
    return "approved";
  }
  if (!approved && edited) {
    return "edited_not_approved";
  }
  // !approved && !edited
  return "pending";
}
```

### Frontend (`payroll-reports-dashboard.tsx`)

The cell rendering logic with fallback:

```typescript
const cellEdited = cell.edited ?? cell.hasEdits ?? false;
const cellStatus =
  cell.status ??
  (cell as { dayStatus?: string }).dayStatus ??
  (cell.approved && cellEdited
    ? "edited_and_approved"
    : cell.approved && !cellEdited
      ? "approved"
      : !cell.approved && cellEdited
        ? "edited_not_approved"
        : "pending");
```

## Visual Legend

The legend displayed at the top of the matrix:

- 🟠 **Pendiente** (Orange chip with orange dot)
- 🟢 **Aprobado** (Green chip with green dot)
- 🟡 **Editado y aprobado** (Yellow chip with yellow dot)
- 🟣 **Editado sin aprobar** (Purple chip with purple dot)

## Important Notes

1. **Green is exclusive**: A cell will ONLY be green if it is approved AND has never been edited
2. **Edited flag is persistent**: Once `edited = true`, the cell will be yellow (if approved) or purple (if not approved)
3. **Approval state is independent**: A day can be approved/unapproved regardless of edit state
4. **All four states are mutually exclusive**: Each cell can only be in one of the four states at a time

## Testing

Run the test suite to verify the logic:

```bash
npm test
```

The test "derives bubble status using approved and edited flags" in `tests/payroll-reports-service.test.mjs` validates all four color states.
