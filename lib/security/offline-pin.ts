"use client";

import type { PinScope } from "@/lib/security/pin-session";

const OFFLINE_TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const STORAGE_KEY_PREFIX = "salc_offline_pin_";
const PIN_HASH_KEY_PREFIX = "salc_pin_hash_";

type OfflinePinToken = {
  scope: PinScope;
  expiresAt: number;
  version: number;
};

type CachedPinHash = {
  hash: string;
  updatedAt: string;
  version: number;
};

function getStorageKey(scope: PinScope): string {
  return `${STORAGE_KEY_PREFIX}${scope}`;
}

function getPinHashKey(scope: PinScope): string {
  return `${PIN_HASH_KEY_PREFIX}${scope}`;
}

/**
 * Simple hash function for PIN validation (not cryptographically secure, but sufficient for offline validation)
 */
async function simpleHash(pin: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  
  // Fallback for environments without crypto.subtle
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

/**
 * Cache PIN hash for offline validation
 */
export async function cachePinHash(scope: PinScope, pin: string): Promise<void> {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return;
  }

  try {
    const hash = await simpleHash(pin);
    const cached: CachedPinHash = {
      hash,
      updatedAt: new Date().toISOString(),
      version: 1,
    };
    
    localStorage.setItem(getPinHashKey(scope), JSON.stringify(cached));
  } catch (error) {
    console.error("Failed to cache PIN hash", error);
  }
}

/**
 * Verify PIN against cached hash
 */
export async function verifyCachedPin(scope: PinScope, pin: string): Promise<boolean> {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return false;
  }

  try {
    const raw = localStorage.getItem(getPinHashKey(scope));
    if (!raw) {
      return false;
    }

    const cached = JSON.parse(raw) as CachedPinHash;
    const hash = await simpleHash(pin);
    
    return hash === cached.hash;
  } catch (error) {
    console.error("Failed to verify cached PIN", error);
    return false;
  }
}

/**
 * Check if PIN hash is cached
 */
export function hasCachedPinHash(scope: PinScope): boolean {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return false;
  }

  try {
    const raw = localStorage.getItem(getPinHashKey(scope));
    return raw !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Store an offline PIN token after successful online verification
 */
export function setOfflinePinToken(scope: PinScope): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return;
  }

  const token: OfflinePinToken = {
    scope,
    expiresAt: Date.now() + OFFLINE_TOKEN_TTL_MS,
    version: 1,
  };

  try {
    localStorage.setItem(getStorageKey(scope), JSON.stringify(token));
  } catch (error) {
    console.error("Failed to store offline PIN token", error);
  }
}

/**
 * Check if there's a valid offline PIN token
 */
export function hasValidOfflinePinToken(scope: PinScope): boolean {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return false;
  }

  try {
    const raw = localStorage.getItem(getStorageKey(scope));
    if (!raw) {
      return false;
    }

    const token = JSON.parse(raw) as OfflinePinToken;
    
    if (token.scope !== scope) {
      return false;
    }

    if (token.expiresAt <= Date.now()) {
      // Token expired, clean it up
      localStorage.removeItem(getStorageKey(scope));
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to check offline PIN token", error);
    return false;
  }
}

/**
 * Clear the offline PIN token
 */
export function clearOfflinePinToken(scope: PinScope): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(getStorageKey(scope));
  } catch (error) {
    console.error("Failed to clear offline PIN token", error);
  }
}

/**
 * Clear all offline PIN tokens and hashes
 */
export function clearAllOfflinePinData(): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(getStorageKey("manager"));
    localStorage.removeItem(getStorageKey("staff"));
    localStorage.removeItem(getPinHashKey("manager"));
    localStorage.removeItem(getPinHashKey("staff"));
  } catch (error) {
    console.error("Failed to clear offline PIN data", error);
  }
}

/**
 * Verify a PIN - tries online first, falls back to offline cached hash
 */
export async function verifyPin(
  scope: PinScope,
  pin: string
): Promise<{ valid: boolean; error?: string; offline?: boolean }> {
  const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;

  if (!isOnline) {
    // When offline, verify against cached PIN hash
    const hasCached = hasCachedPinHash(scope);
    
    if (!hasCached) {
      return {
        valid: false,
        error: "No hay conexión y no tienes un PIN guardado. Conecta a internet al menos una vez.",
        offline: true,
      };
    }
    
    const isValid = await verifyCachedPin(scope, pin);
    
    if (isValid) {
      // Set token for future use
      setOfflinePinToken(scope);
      return { valid: true, offline: true };
    }
    
    return {
      valid: false,
      error: "PIN incorrecto.",
      offline: true,
    };
  }

  // When online, verify via server
  try {
    const response = await fetch("/api/security/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type: scope, pin }),
    });

    const result = (await response.json()) as {
      valid?: boolean;
      error?: string;
    };

    if (result.valid) {
      // Store offline token for future offline access
      setOfflinePinToken(scope);
      // Cache the PIN hash for offline validation
      await cachePinHash(scope, pin);
      return { valid: true };
    }

    return {
      valid: false,
      error: result.error ?? "PIN incorrecto.",
    };
  } catch (error) {
    console.error("Failed to verify PIN online", error);
    
    // If we get a network error, try cached PIN
    const hasCached = hasCachedPinHash(scope);
    
    if (hasCached) {
      const isValid = await verifyCachedPin(scope, pin);
      
      if (isValid) {
        setOfflinePinToken(scope);
        return { valid: true, offline: true };
      }
    }
    
    return {
      valid: false,
      error: "No se pudo verificar el PIN. Intenta nuevamente.",
    };
  }
}

/**
 * Check if PIN access is available (either online or with cached PIN)
 */
export function isPinAccessAvailable(scope: PinScope): boolean {
  const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;
  
  if (isOnline) {
    return true;
  }
  
  return hasCachedPinHash(scope);
}
