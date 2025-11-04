"use client";

import type { PinScope } from "@/lib/security/pin-session";

const OFFLINE_TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const STORAGE_KEY_PREFIX = "salc_offline_pin_";

type OfflinePinToken = {
  scope: PinScope;
  expiresAt: number;
  version: number;
};

function getStorageKey(scope: PinScope): string {
  return `${STORAGE_KEY_PREFIX}${scope}`;
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
 * Clear all offline PIN tokens
 */
export function clearAllOfflinePinTokens(): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(getStorageKey("manager"));
    localStorage.removeItem(getStorageKey("staff"));
  } catch (error) {
    console.error("Failed to clear offline PIN tokens", error);
  }
}

/**
 * Verify a PIN - tries online first, falls back to offline token check
 */
export async function verifyPin(
  scope: PinScope,
  pin: string
): Promise<{ valid: boolean; error?: string; offline?: boolean }> {
  const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;

  if (!isOnline) {
    // When offline, we can't verify the actual PIN, but we can check
    // if there's a valid offline token from a previous successful verification
    const hasToken = hasValidOfflinePinToken(scope);
    
    if (hasToken) {
      return { valid: true, offline: true };
    }
    
    return {
      valid: false,
      error: "No hay conexión y no tienes autorización previa guardada.",
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
      return { valid: true };
    }

    return {
      valid: false,
      error: result.error ?? "PIN incorrecto.",
    };
  } catch (error) {
    console.error("Failed to verify PIN online", error);
    
    // If we get a network error, check for offline token
    const hasToken = hasValidOfflinePinToken(scope);
    
    if (hasToken) {
      return { valid: true, offline: true };
    }
    
    return {
      valid: false,
      error: "No se pudo verificar el PIN. Intenta nuevamente.",
    };
  }
}

/**
 * Check if PIN access is available (either online or with offline token)
 */
export function isPinAccessAvailable(scope: PinScope): boolean {
  const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;
  
  if (isOnline) {
    return true;
  }
  
  return hasValidOfflinePinToken(scope);
}
