import { hasValidPinSession, type PinScope } from "@/lib/security/pin-session";
import { isSecurityPinEnabled } from "@/features/security/data/pins";

export async function hasAccess(scope: PinScope): Promise<boolean> {
  const enabled = await isSecurityPinEnabled(scope);
  if (!enabled) return true;
  return hasValidPinSession(scope);
}
