import { redirect } from "@tanstack/react-router";
import { stashPostLoginReturn } from "@/lib/auth/post-login-return";
import {
  isAccessUsable,
  isRefreshUsable,
  loadSession,
} from "@/lib/auth/token-storage";

/**
 * Route guard for `beforeLoad` on authenticated routes. Synchronous: it only
 * checks that a usable token exists locally (the shell fetches `/me` and the API
 * middleware handles a stale token / 401 funnel). Redirects to login otherwise,
 * remembering the target so login can send the user back (e.g. OAuth consent).
 */
export function requireSession({
  location,
}: {
  location: { href: string };
}): void {
  const session = loadSession();
  if (!(isAccessUsable(session) || isRefreshUsable(session))) {
    stashPostLoginReturn(location.href);
    throw redirect({ to: "/auth/login" });
  }
}
