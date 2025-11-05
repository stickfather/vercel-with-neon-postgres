# SALC Offline Functionality - QA Checklist

## Pre-Test Setup

- [ ] Clear browser cache and IndexedDB
- [ ] Start with a fresh session
- [ ] Have DevTools open (Application + Console tabs)
- [ ] Test in Chrome/Edge (best DevTools support)

## A. App Shell & Caching

### Initial Load (Online)
- [ ] Visit app root (`/`) while online
- [ ] Verify page loads normally
- [ ] Check DevTools → Application → Service Workers shows "activated"
- [ ] Check IndexedDB → `salc_offline` database exists
- [ ] Navigate to `/registro` and back to `/`

### Offline Load
- [ ] DevTools → Network → Enable "Offline"
- [ ] Reload page
- [ ] ✅ Page loads from cache (no network errors)
- [ ] ✅ App shell renders correctly
- [ ] ✅ Offline banner shows "📡 Esperando conexión a Internet…"

## B. Offline Check-In Flow

### Student Search (Offline)
- [ ] Ensure you visited `/registro` at least once while online (to cache students)
- [ ] Go offline (DevTools → Network → Offline)
- [ ] Navigate to `/registro`
- [ ] ✅ Page loads without errors
- [ ] Start typing a student name
- [ ] ✅ Autocomplete shows suggestions from cache
- [ ] Select a student from suggestions

### Level & Lesson Selection (Offline)
- [ ] ✅ Level buttons render and are selectable
- [ ] Select a level (e.g., A1)
- [ ] ✅ Lesson buttons load from cache
- [ ] Select a lesson
- [ ] ✅ No network errors in console

### Submit Check-In (Offline)
- [ ] Click "Confirmar asistencia"
- [ ] ✅ Success message: "Asistencia registrada sin conexión..."
- [ ] ✅ Redirects to `/` (home page)
- [ ] ✅ Welcome message shows: "¡Bienvenido/a! Tu registro se guardó localmente..."
- [ ] ✅ Offline banner shows pending count (e.g., "🔄 ... 1")

### Verify Queue
- [ ] DevTools → Application → IndexedDB → `salc_offline` → `outbox`
- [ ] ✅ Entry exists with `type: "student-check-in"`, `status: "pending"`
- [ ] Check `recentAttendance` table
- [ ] ✅ Entry exists with `type: "check-in"`, recent timestamp

## C. Offline Sync

### Reconnection
- [ ] DevTools → Network → Disable "Offline"
- [ ] Wait 2-3 seconds
- [ ] ✅ Offline banner changes to "🔄 Sincronizando cambios pendientes..."
- [ ] ✅ After sync: banner shows "Cambios sincronizados." briefly

### Verify Sync Success
- [ ] DevTools → IndexedDB → `outbox`
- [ ] ✅ Entry status changed to `"done"` (or entry removed)
- [ ] ✅ Pending count in banner returns to 0
- [ ] Check server database or admin panel
- [ ] ✅ Check-in record exists on server

## D. Staff Flows (Offline)

### Staff Check-In
- [ ] Load staff list while online
- [ ] Go offline
- [ ] Navigate to staff check-in page (if exists)
- [ ] ✅ Staff list loads from cache
- [ ] Select a staff member
- [ ] Click check-in
- [ ] ✅ Queued successfully
- [ ] ✅ Shows in outbox with `type: "staff-check-in"`

### Staff Check-Out
- [ ] While still offline
- [ ] Select a checked-in staff member
- [ ] Click check-out
- [ ] ✅ Queued successfully
- [ ] ✅ Shows in outbox with `type: "staff-check-out"`

### Staff Sync
- [ ] Go back online
- [ ] ✅ Staff events sync to server
- [ ] ✅ Outbox entries marked done

## E. PIN Gates (Offline)

### Load PINs
- [ ] While online, visit a PIN-gated page
- [ ] DevTools → IndexedDB → `pins` table
- [ ] ✅ Entries exist: `{ role: "staff", pin: "1234" }`, `{ role: "manager", pin: "5678" }`

### Offline PIN Validation
- [ ] Go offline
- [ ] Navigate to a PIN-gated route (e.g., admin panel)
- [ ] Enter correct PIN (default: `1234` for staff)
- [ ] ✅ Route unlocks and loads
- [ ] ✅ No network errors

### Invalid PIN (Offline)
- [ ] Go offline again
- [ ] Try entering wrong PIN (e.g., `9999`)
- [ ] ✅ Error message shows
- [ ] ✅ Route stays locked

## F. Routing (No Hard Reloads)

### Check-In → Welcome Flow
- [ ] Complete check-in while offline
- [ ] ✅ Uses `router.push('/')` (Next.js router)
- [ ] ✅ Page transitions smoothly
- [ ] ✅ No full page reload (SPA navigation)
- [ ] ✅ Offline state preserved

### Navigation While Offline
- [ ] While offline, use navigation links
- [ ] Navigate: `/` → `/registro` → `/` → admin panel
- [ ] ✅ All transitions work
- [ ] ✅ Offline banner persists across pages
- [ ] ✅ No white screens or crashes

## G. Edge Cases

### Empty Cache
- [ ] Clear IndexedDB (`salc_offline`)
- [ ] Go offline immediately
- [ ] Navigate to `/registro`
- [ ] ✅ Shows helpful message: "No se pudieron cargar las lecciones" or similar
- [ ] ✅ App doesn't crash

### Multiple Queued Events
- [ ] Go offline
- [ ] Check-in 3 different students
- [ ] ✅ All 3 show in outbox
- [ ] ✅ Pending count shows "3"
- [ ] Go online
- [ ] ✅ All 3 sync successfully

### Sync Failure
- [ ] Add an invalid entry to outbox manually (bad payload)
- [ ] Go online
- [ ] ✅ App doesn't crash
- [ ] ✅ Failed entry marked `status: "failed"` after retries

## H. PWA Manifest

### Installation Prompt
- [ ] Visit app multiple times on mobile/desktop
- [ ] ✅ Browser shows "Add to Home Screen" prompt (if supported)
- [ ] Check DevTools → Application → Manifest
- [ ] ✅ Manifest loads: `name: "Inglés Rápido - Manta"`, `start_url: "/"`

### Standalone Mode
- [ ] Install app to home screen (if device supports)
- [ ] Launch from home screen icon
- [ ] ✅ Opens in standalone mode (no browser chrome)
- [ ] ✅ Theme color matches (`#00bfa6`)

## I. Performance

### Cache Size
- [ ] DevTools → Application → Storage
- [ ] ✅ Cache storage < 50 MB
- [ ] ✅ IndexedDB < 10 MB

### Load Times
- [ ] Clear cache, load while online
- [ ] ✅ Initial load < 3 seconds
- [ ] Go offline, reload
- [ ] ✅ Offline load < 1 second

## J. Browser Compatibility

Test in each browser:

### Chrome/Edge
- [ ] ✅ Service worker installs
- [ ] ✅ IndexedDB works
- [ ] ✅ Offline flows work

### Firefox
- [ ] ✅ Service worker installs
- [ ] ✅ IndexedDB works
- [ ] ✅ Offline flows work

### Safari (macOS/iOS)
- [ ] ✅ Service worker installs
- [ ] ✅ IndexedDB works
- [ ] ✅ Offline flows work
- [ ] ⚠️ Note: Safari has stricter PWA limits

## Summary

**Total Test Cases**: ~50
**Pass Criteria**: All ✅ items must pass
**Blocker Threshold**: Any crash or data loss is a blocker

## Issue Reporting Template

When you find a bug:

```
**Issue**: [Brief description]
**Steps to Reproduce**:
1. 
2. 
3. 

**Expected**: [What should happen]
**Actual**: [What actually happened]
**Console Errors**: [Paste any errors]
**Browser**: [Chrome 120 / Firefox 121 / etc.]
**Network State**: [Online / Offline]
```

## Sign-Off

- [ ] All critical flows tested and passing
- [ ] No blockers or crashes
- [ ] Documentation reviewed
- [ ] Code reviewed

**Tester**: _______________  
**Date**: _______________  
**Build**: _______________
