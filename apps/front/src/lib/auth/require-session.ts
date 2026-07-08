import { redirect } from "@tanstack/react-router";
import {
  isAccessUsable,
  isRefreshUsable,
  loadSession,
} from "@/lib/auth/token-storage";

/**
 * Route guard for `beforeLoad` on the authenticated layout. Synchronous: it only
 * checks that a usable token exists locally (the shell fetches `/me` and the API
 * middleware handles a stale token / 401 funnel). Redirects to login otherwise.
 */
export function requireSession(): void {
  const session = loadSession();
  if (!(isAccessUsable(session) || isRefreshUsable(session))) {
    throw redirect({ to: "/auth/login" });
  }
}
