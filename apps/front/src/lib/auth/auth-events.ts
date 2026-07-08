/**
 * Tiny pub/sub used to funnel every "you are no longer signed in" signal —
 * a 401, a failed refresh, or a manual logout — to a single listener that
 * redirects to the login screen. Decouples the API layer (which detects the
 * problem) from the router (which reacts to it).
 */

export type SessionExpiredReason = "expired" | "manual";

type Listener = (reason: SessionExpiredReason) => void;

const listeners = new Set<Listener>();

export function onSessionExpired(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitSessionExpired(reason: SessionExpiredReason): void {
  for (const listener of listeners) {
    listener(reason);
  }
}
