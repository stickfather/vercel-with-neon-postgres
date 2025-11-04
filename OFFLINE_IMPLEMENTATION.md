# Offline Check-in/Checkout Implementation Summary

## Overview

This document describes the complete implementation of offline functionality for student and staff check-in/checkout, including PIN access control and local directory caching.

## Architecture

### Data Storage

**IndexedDB Database: `salc_offline`**
- `students_cache` - Cached student directory (id, fullName)
- `staff_cache` - Cached staff directory (id, fullName, role)
- `metadata` - Cache versioning and timestamps
- `pending_events` - Queue for offline check-in/out events

**localStorage**
- Existing queue system for pending requests
- Offline PIN tokens (8-hour TTL)

**Server-side: PostgreSQL**
- `offline_event_log` - Idempotency tracking for synced events

## Implementation Details

### 1. Cache Management

**Cache Population:**
```
App Load (Online) → OfflineProvider.useEffect()
  ↓
  Fetch /api/students/cache-snapshot
  Fetch /api/staff/cache-snapshot
  ↓
  Store in IndexedDB
```

**Cache Usage:**
```
Form Submit → Check navigator.onLine
  ↓
  Online: Fetch from API
  Offline: Load from IndexedDB cache
```

**Cache Refresh:**
- On app load (if online)
- Every 5 minutes (if online)
- When coming back online

### 2. Event Queueing & Sync

**Offline Event Flow:**
```
User Action (Offline) → queueableFetch()
  ↓
  Detect offline → enqueueRequest()
  ↓
  Store in localStorage
  ↓
  Return 202 "queued" response
```

**Sync Flow:**
```
Come Online → OfflineProvider triggers syncQueue()
  ↓
  Process localStorage queue
  ↓
  POST /api/offline-sync with events
  ↓
  Server processes each event:
    - Check offline_event_log for duplicates
    - Execute check-in/out operation
    - Log result in offline_event_log
  ↓
  Update local queue (remove synced, mark failed)
```

### 3. PIN Access (Offline Support)

**Online Verification:**
```
User Enters PIN → verifyPin()
  ↓
  POST /api/security/verify
  ↓
  If valid: Store offline token in localStorage
  ↓
  Return success
```

**Offline Verification:**
```
User Enters PIN → verifyPin()
  ↓
  Detect offline → Check localStorage for token
  ↓
  If valid token exists: Allow access
  Otherwise: Show error message
```

**Security:**
- Tokens expire after 8 hours
- No PIN hashes stored client-side
- Only verification tokens (signed, timestamped)

### 4. UI Components

**Offline Banner:**
- Only shows when offline
- Orange gradient background
- Message: "🟠 Modo offline – guardando localmente"
- Fixed position at top

**Failed Events Badge:**
- Shows count of failed sync events
- Updates every 10 seconds
- Only appears when failures exist
- Message: "⚠️ X eventos requieren revisión"

## API Endpoints

### GET /api/students/cache-snapshot
Returns complete student directory for offline caching.

**Response:**
```json
{
  "students": [
    { "id": 1, "fullName": "Juan Pérez" },
    ...
  ],
  "version": 1,
  "timestamp": "2025-11-04T14:30:00Z"
}
```

### GET /api/staff/cache-snapshot
Returns complete staff directory for offline caching.

**Response:**
```json
{
  "staff": [
    { "id": 1, "fullName": "María García", "role": "Teacher" },
    ...
  ],
  "version": 1,
  "timestamp": "2025-11-04T14:30:00Z"
}
```

### POST /api/offline-sync
Processes queued offline events with idempotency.

**Request:**
```json
{
  "events": [
    {
      "id": "evt_123_abc",
      "type": "student-checkin",
      "payload": {
        "studentId": 1,
        "level": "A1",
        "lessonId": 5,
        "confirmOverride": false
      },
      "createdAt": 1699105800000
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "processed": 5,
  "failed": 1,
  "duplicates": 0,
  "results": [
    {
      "id": "evt_123_abc",
      "status": "success"
    },
    {
      "id": "evt_124_def",
      "status": "failed",
      "error": "La asistencia ya estaba cerrada o no existe."
    }
  ]
}
```

## Edge Case Handling

### Duplicate Check-in
**Scenario:** User checks in twice (once offline, once online)

**Handling:**
1. Second check-in attempt fails server-side
2. Event marked as "failed" in offline_event_log
3. Event status updated to "failed" in IndexedDB
4. Failed events badge shows the error

### Checkout Without Open Session
**Scenario:** User tries to checkout without checking in first

**Handling:**
1. Checkout fails server-side
2. Event marked as "failed" with specific error message
3. Failed events badge alerts user

### Offline Cache Miss
**Scenario:** User goes offline before any cache is populated

**Handling:**
1. Student search shows error message
2. Staff form may show empty state
3. Forms remain functional for future use

### PIN Without Offline Token
**Scenario:** User needs PIN access but has never verified online

**Handling:**
1. Clear error message displayed
2. User instructed to verify online first
3. No security bypass

## File Structure

```
lib/
  offline/
    indexeddb.ts          # IndexedDB operations
    fetch.ts              # Existing: queueableFetch wrapper
    queue.ts              # Existing: localStorage queue
  security/
    offline-pin.ts        # Offline PIN token management
    pin-session.ts        # Existing: Server-side PIN sessions

app/api/
  students/
    cache-snapshot/
      route.ts            # Students cache endpoint
  staff/
    cache-snapshot/
      route.ts            # Staff cache endpoint
  offline-sync/
    route.ts              # Sync endpoint

features/
  offline/
    sync.ts               # Sync worker implementation
    OfflineProvider.tsx   # (Duplicate, not used)
  student-checkin/
    components/
      check-in-form.tsx   # Updated: Cache fallback
  staff/
    components/
      registro-page-shell.tsx  # Updated: Cache loading
  security/
    components/
      PinPrompt.tsx       # Updated: Offline PIN support

components/
  offline/
    offline-provider.tsx  # Updated: Cache refresh
    offline-banner.tsx    # Updated: Orange-only banner
    failed-events-badge.tsx  # New: Failed events UI
```

## Testing Recommendations

### Manual Testing Scenarios

1. **Cache Population**
   - Load app online
   - Check DevTools → Application → IndexedDB
   - Verify students_cache and staff_cache populated

2. **Offline Check-in**
   - Submit check-in online (verify works)
   - Go offline (DevTools → Network → Offline)
   - Submit check-in
   - Verify queued message
   - Go back online
   - Verify sync happens

3. **Edge Cases**
   - Check in same student twice
   - Try checkout without check-in
   - Verify failed events badge appears

4. **PIN Offline**
   - Verify PIN online
   - Go offline
   - Navigate to protected page
   - Verify PIN prompt accepts previous verification

### Unit Testing Recommendations

```javascript
// IndexedDB operations
describe('IndexedDB', () => {
  it('should store and retrieve students cache')
  it('should store and retrieve staff cache')
  it('should track pending events')
  it('should update event status')
})

// Offline PIN
describe('Offline PIN', () => {
  it('should store offline token after verification')
  it('should validate offline token')
  it('should expire old tokens')
})

// Sync endpoint
describe('Offline Sync', () => {
  it('should process check-in events')
  it('should handle duplicate events')
  it('should handle checkout without session')
})
```

## Known Limitations

1. **Attendance Boards:** Don't update with offline data
2. **Lesson Catalog:** Not cached offline
3. **Multi-Device:** Changes don't sync between devices until online
4. **Cache Size:** No automatic pruning

## Future Enhancements

1. **Service Worker:** Better offline experience
2. **Lesson Caching:** Cache lesson catalog for full offline functionality
3. **Real-time Sync:** WebSocket for instant updates when online
4. **Admin UI:** View and manage failed events
5. **Cache Pruning:** Automatic cleanup of old data
6. **Conflict Resolution:** Handle multi-device conflicts

## Deployment Notes

### Database Migration

The `offline_event_log` table is created automatically by the `/api/offline-sync` endpoint on first use. No manual migration required.

### Environment Variables

No new environment variables required. Uses existing:
- `DATABASE_URL` - For PostgreSQL connection
- `PIN_SESSION_SECRET` - For PIN session signing

### Browser Requirements

- IndexedDB support (all modern browsers)
- localStorage support (all modern browsers)
- Online/offline detection (navigator.onLine)

### Performance Considerations

- IndexedDB operations are async (non-blocking)
- Cache refresh happens in background
- Sync operations batched for efficiency
- Failed events checked every 10 seconds (low overhead)

## Rollback Plan

If issues arise:

1. **Disable Offline Provider Cache Refresh:**
   - Comment out cache refresh calls in OfflineProvider
   - Users can still function online

2. **Disable Offline Sync:**
   - Return 503 from /api/offline-sync
   - Events remain queued until fixed

3. **Disable Offline PIN:**
   - Remove verifyPin import in PinPrompt
   - Fallback to online-only verification

## Support & Troubleshooting

### User Reports Offline Not Working

1. Check browser console for errors
2. Verify IndexedDB has data (DevTools → Application)
3. Check localStorage queue (DevTools → Application)
4. Verify offline_event_log table exists in database

### Sync Fails

1. Check /api/offline-sync endpoint logs
2. Verify database connection
3. Check offline_event_log for duplicate entries
4. Clear localStorage queue if corrupted

### PIN Issues Offline

1. Check localStorage for offline tokens
2. Verify token not expired (8-hour TTL)
3. Have user verify PIN online first
4. Check browser's localStorage is enabled

## Conclusion

This implementation provides comprehensive offline support for the SALC system, enabling check-in/checkout operations to continue seamlessly when connectivity is lost. The system prioritizes data integrity through idempotency checking and provides clear feedback to users about offline status and any issues that arise during synchronization.
