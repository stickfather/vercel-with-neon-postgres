# Offline Mode Setup Guide

## 🎯 Simplified Approach (No Setup Required!)

**Staff PIN** now works offline with a **universal master override code: "9999"**

- **When Online**: Uses actual PIN from database (normal validation)
- **When Offline**: Accepts "9999" as universal master override
- **No environment variables needed**
- **No prior online validation required**

**Manager PIN** still requires database validation (no universal override for security).

---

## Quick Start

### 1. Set Environment Variables

For offline PIN validation to work, you need to set plaintext PINs in your environment that **match** the PINs stored (hashed) in your database.

**Local Development** (`.env.local`):
```bash
OFFLINE_STAFF_PIN="your_actual_staff_pin"
OFFLINE_MANAGER_PIN="your_actual_manager_pin"
```

**Vercel Deployment**:
1. Go to Project Settings → Environment Variables
2. Add actual PINs from database
3. Redeploy

### 6. Troubleshooting
```bash
OFFLINE_STAFF_PIN="1234"
OFFLINE_MANAGER_PIN="5678"
```

**Vercel Deployment**:
1. Go to Project Settings → Environment Variables
2. Add:
   - `OFFLINE_STAFF_PIN` = your actual staff PIN (e.g., "1234")
   - `OFFLINE_MANAGER_PIN` = your actual manager PIN (e.g., "5678")
3. Redeploy

### 2. Ensure Database PINs Match

The PINs you set in environment variables **MUST** match the PINs in your database:

```sql
-- Check current PINs (they're hashed, so you need to know what they are)
SELECT role, pin_hash, active FROM access_pins WHERE active = TRUE;

-- If needed, set PINs via the admin UI at /administracion/configuracion
-- Or use the app's PIN management interface
```

### 3. How It Works

**Staff PIN (Simple Universal Master Override)**:
- **Online**: Validates against actual PIN in database
- **Offline**: Accepts "9999" as universal master override (no configuration needed)
- Works immediately without any prior validation

**Manager PIN (Database Validation)**:
- **Online**: Validates against actual PIN in database  
- **Offline**: Requires prior online validation to cache PIN in IndexedDB
- No universal override for manager scope

**First Time Online Validation** (for caching actual PINs):
1. User enters PIN
2. Server validates against database (bcrypt hash)
3. If valid, PIN is cached in IndexedDB (plaintext)
4. Session created in localStorage (24hr)

**Subsequent Access Offline**:
1. Staff: Enter "9999" → Works immediately (master override)
2. Manager: Enter cached PIN → Works if validated online previously

### 4. Testing Offline Staff Access

**Simple Test** (No Setup Required):
1. Go to `/administracion` (staff admin hub)
2. **Disconnect internet** (DevTools → Network → Offline)
3. Enter PIN: **9999** (master override)
4. ✅ Should unlock immediately

**Online Staff Access**:
1. With internet connected
2. Enter your actual database PIN
3. ✅ Validates against database normally

### 5. Environment Variables (Optional)

Environment variables are now **optional** since staff PIN has universal offline override.

If you still want to cache actual PINs for offline use:

**"No pudimos validar el PIN solicitado" (Staff)**:

1. **Try universal master override**: Enter "9999" when offline
2. **Check browser console** for logs:
   - `[Offline PIN] Staff universal offline master override accepted: 9999`
3. If "9999" doesn't work offline, check console for errors

**"No pudimos validar el PIN solicitado" (Manager)**:

1. **Check browser console** for detailed logs:
   - `[DataInit]` - Shows if PINs were cached on load
   - `[PinPrompt]` - Shows validation attempts
   - `[Offline PIN]` - Shows offline validation details

2. **Verify environment variables**:
   ```bash
   # Local
   cat .env.local | grep OFFLINE
   
   # Vercel
   Check Project Settings → Environment Variables
   ```

3. **Test online validation first**:
   - Make sure you're online
   - Try entering PIN
   - If it fails, PIN doesn't match database
   - Check database or reset PIN via admin UI

4. **Clear IndexedDB and try again**:
   - Open DevTools → Application → Storage
   - Clear IndexedDB → `salc_offline`
   - Refresh page
   - Try PIN validation while online

### 7. Security Note

⚠️ **This setup is intentionally simple** per requirements:
- Staff PIN has universal master override "9999" (no encryption)
- Manager PIN requires database validation
- PINs cached in plaintext in IndexedDB
- Suitable for non-sensitive environments

For production with sensitive data:
- Use proper authentication (OAuth, JWT)
- Encrypt local storage
- Implement audit logging
- Use secure PIN rotation

---

## Common Issues

### "Staff PIN not working offline"
- **Solution**: Try universal master override "9999"
- Should work immediately without any setup

### "Manager PIN not working offline"
- Manager PIN hasn't been validated online yet
- No cached PIN in IndexedDB
- **Solution**: Validate manager PIN online first to cache it

### "Server validation failed (Online)"
- Entered PIN doesn't match database PIN
- **Solution**: Check actual PIN in database or admin UI

### "PINs not caching"
- IndexedDB not initializing
- Service worker not registering
- **Solution**: Check console for `[DataInit]` logs

---

## Environment Variable Summary (Optional)

| Variable | Purpose | Default | Required |
|----------|---------|---------|----------|
| `OFFLINE_STAFF_PIN` | Staff PIN for API endpoint caching | `"1234"` | No (universal override exists) |
| `OFFLINE_MANAGER_PIN` | Manager PIN for offline caching | `"5678"` | Optional |

**Note**: Staff PIN has universal master override "9999", so environment variables are optional for basic offline functionality.
