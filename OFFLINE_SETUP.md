# Offline Mode Setup Guide

## Quick Start

### 1. Set Environment Variables

For offline PIN validation to work, you need to set plaintext PINs in your environment that **match** the PINs stored (hashed) in your database.

**Local Development** (`.env.local`):
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

**First Time (Online)**:
1. User enters PIN
2. Server validates against database (bcrypt hash)
3. If valid, PIN is cached in IndexedDB (plaintext)
4. Session created in localStorage (24hr)

**Subsequent Access (Offline)**:
1. User enters PIN
2. App validates against cached PIN (plaintext comparison)
3. No server connection needed

**The Problem**:
If environment variable PINs don't match database PINs, online validation fails and there's nothing to cache for offline use.

### 4. Setting PINs for the First Time

**Option A: Via Admin UI (Recommended)**
1. Go to `/administracion/configuracion`
2. Set Staff PIN and Manager PIN
3. Remember these PINs!
4. Add them to environment variables

**Option B: Default PINs**
- Staff: `1234`
- Manager: `5678`

If you haven't changed the PINs, the defaults should work. Make sure they're set in your environment variables.

### 5. Troubleshooting

**"No pudimos validar el PIN solicitado"**:

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

### 6. Security Note

⚠️ **This setup is intentionally simple** per requirements. PINs are:
- Stored in plaintext in environment variables
- Cached in plaintext in IndexedDB
- Not encrypted

For production with sensitive data:
- Use proper authentication (OAuth, JWT)
- Encrypt local storage
- Implement audit logging
- Use secure PIN rotation

---

## Common Issues

### "Offline fallback also failed"
- PIN hasn't been validated online yet
- No cached PIN in IndexedDB
- **Solution**: Validate PIN online first

### "Server validation failed"
- Environment variable PIN doesn't match database PIN
- **Solution**: Update `.env.local` or Vercel environment variables

### "PINs not caching"
- IndexedDB not initializing
- Service worker not registering
- **Solution**: Check console for `[DataInit]` logs

---

## Environment Variable Summary

| Variable | Purpose | Default | Required |
|----------|---------|---------|----------|
| `OFFLINE_STAFF_PIN` | Staff PIN for offline caching | `"1234"` | Recommended |
| `OFFLINE_MANAGER_PIN` | Manager PIN for offline caching | `"5678"` | Recommended |

Set these in:
- `.env.local` for local development
- Vercel Project Settings for production
