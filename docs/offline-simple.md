# SALC Offline-First Architecture (Simple Mode)

## Overview

The SALC app now supports **100% offline functionality** for student/staff check-in/checkout flows. This document explains the simple, pragmatic offline architecture.

## Key Design Principles

1. **Simplicity over Security**: PINs are stored in **plaintext** in IndexedDB for offline access
2. **Robustness**: Data is queued locally and synced when connection returns
3. **No Hard Reloads**: All navigation uses Next.js router to preserve offline state
4. **Progressive Enhancement**: Works online with server, falls back to local storage offline

## Architecture Components

### 1. IndexedDB (via Dexie)

**Database**: `salc_offline`

**Tables**:
- `students` - Cached student list for autocomplete
- `staff` - Cached staff list
- `pins` - **Plaintext** PINs for offline validation
- `lessons` - Lesson catalog cache
- `recentAttendance` - Recent check-in/out events
- `lastCheckins` - Last check-in timestamp per person
- `outbox` - Queued mutations waiting for sync
- `offlineLog` - Debug log of offline events

### 2. Service Worker (`/public/sw.js`)

- Caches app shell (/, /registro)
- Implements stale-while-revalidate for dynamic content
- Provides offline fallback page
- Registered automatically on app load

### 3. Data Client (`/lib/dataClient.ts`)

**Read Operations**:
- `getStudents()` - Fetch from server if online, fallback to cache
- `getStaff()` - Same pattern
- `getLessons()` - Same pattern
- `getPins()` - Fetch plaintext PINs for offline validation

**Write Operations**:
- `checkinStudent()` - Queue to outbox if offline
- `checkoutStudent()` - Queue to outbox if offline
- `checkinStaff()` - Queue to outbox if offline
- `checkoutStaff()` - Queue to outbox if offline

**Sync Engine**:
- `syncOutbox()` - Process queued events on reconnection
- Retries failed requests up to 3 times
- Marks conflicts for manual resolution

### 4. PIN Validation (`/lib/pins.ts`)

**Plaintext Storage**: PINs are stored as-is (e.g., "1234") in IndexedDB

**Validation**:
```typescript
validatePinOffline(role, inputPin) {
  const pin = await db.pins.get(role);
  return pin.pin === inputPin.trim();
}
```

**Default PINs** (for development):
- Staff: `1234`
- Manager: `5678`

### 5. Offline Queue Provider

Enhanced `OfflineProvider` tracks:
- Network status (online/offline)
- Pending queue count (localStorage + IndexedDB)
- Sync status and last sync timestamp

Automatically syncs when:
- Connection returns (online event)
- User manually triggers sync

## Offline Flows

### Student Check-In (Offline)

1. Student types name → loads from IndexedDB cache
2. Selects level and lesson → loaded from IndexedDB
3. Submits form → stored in outbox
4. Optimistic update: adds to `recentAttendance`
5. Redirects to `/` with local state message
6. When online: syncs outbox to server

### Staff Check-In/Out (Offline)

Similar flow to student check-in, using staff-specific endpoints.

### PIN Gate (Offline)

1. User enters PIN
2. Compares against plaintext PIN in IndexedDB
3. On match: unlocks protected route
4. Optionally queues audit event to outbox

## UX Indicators

### Offline Banner

Shows at top of screen:
- "📡 Esperando conexión a Internet…" when offline
- "🔄 Sincronizando cambios pendientes… **N**" when syncing
- "Cambios sincronizados." briefly after sync complete

### Success Messages

When offline:
- "Asistencia registrada sin conexión. Se sincronizará automáticamente."

When online:
- "¡Asistencia confirmada, buen trabajo!"

## Data Sync

### Outbox Format

```typescript
{
  id: "uuid",
  type: "student-check-in" | "student-check-out" | "staff-check-in" | "staff-check-out",
  payload: { studentId, lessonId, level, ... },
  createdAt: timestamp,
  attemptCount: 0,
  status: "pending" | "done" | "failed" | "conflict"
}
```

### Sync Process

1. On `online` event or manual trigger
2. Query all `status=pending` entries
3. For each entry:
   - Make API call with payload
   - On success: mark `status=done`
   - On failure: increment `attemptCount`
   - After 3 attempts: mark `status=failed`
4. Update pending count display

## Testing Checklist

### Offline Check-In
- [ ] Load app online → go offline (DevTools Network)
- [ ] Student can search name (from cache)
- [ ] Student can select level and lesson
- [ ] Submit redirects to `/` with confirmation
- [ ] No errors in console
- [ ] Pending count shows in offline banner

### Offline Sync
- [ ] Go back online
- [ ] Outbox syncs automatically
- [ ] Pending count goes to 0
- [ ] Server shows check-in record

### PIN Gates
- [ ] Go offline
- [ ] Enter correct PIN (1234 for staff)
- [ ] Route unlocks
- [ ] Enter wrong PIN → error message

## Files Changed

### New Files
- `/lib/db.ts` - IndexedDB schema
- `/lib/dataClient.ts` - Offline data layer
- `/lib/pins.ts` - PIN validation
- `/public/sw.js` - Service worker
- `/public/manifest.json` - PWA manifest
- `/components/offline/sw-registration.tsx` - SW registration
- `/components/welcome/welcome-message.tsx` - Offline-aware welcome
- `/app/api/pins/route.ts` - PIN API endpoint
- `/docs/offline-simple.md` - This file

### Modified Files
- `/app/layout.tsx` - Added SW registration and manifest
- `/app/page.tsx` - Uses WelcomeMessage component
- `/lib/offline/fetch.ts` - Integrated IndexedDB outbox
- `/components/offline/offline-provider.tsx` - Syncs both queues
- `/features/student-checkin/components/check-in-form.tsx` - Offline-first data loading

## Security Warning

⚠️ **This implementation stores PINs in PLAINTEXT in IndexedDB.** 

This is **intentionally insecure** to prioritize offline functionality and simplicity. In a production environment with sensitive data, you should:

1. Use encrypted storage
2. Implement proper authentication
3. Use secure token-based access
4. Add audit logging

For the SALC use case (educational attendance tracking), plaintext PINs are acceptable as a pragmatic trade-off for offline reliability.

## Future Enhancements

Potential improvements (not implemented):

1. Background sync API for reliable queuing
2. Conflict resolution UI
3. Manual retry for failed syncs
4. Cache expiration and refresh policies
5. Compressed/encrypted IndexedDB storage
6. Push notifications for sync status

## Troubleshooting

### "No students found" when offline
- Ensure you loaded the student list at least once while online
- Check DevTools → Application → IndexedDB → salc_offline → students

### Outbox not syncing
- Check browser console for errors
- Verify network is actually online (not just disabled in DevTools)
- Check outbox table in IndexedDB for status

### Service Worker not installing
- Clear browser cache
- Hard reload (Cmd/Ctrl + Shift + R)
- Check DevTools → Application → Service Workers
- Ensure running on localhost or HTTPS

## Development Commands

```bash
# Build the app
npm run build

# Type check
npx tsc --noEmit

# Clear IndexedDB (DevTools Console)
indexedDB.deleteDatabase('salc_offline')

# Unregister service worker (DevTools Console)
navigator.serviceWorker.getRegistrations().then(r => r.forEach(r => r.unregister()))
```
