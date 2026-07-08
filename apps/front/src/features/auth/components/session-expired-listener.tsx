import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { onSessionExpired } from "@/lib/auth/auth-events";

/**
 * Redirects to the login screen whenever the session ends (a 401, a failed
 * refresh, or a manual logout emit through `auth-events`). Mounted once at the
 * router root.
 */
export function SessionExpiredListener() {
  const navigate = useNavigate();
  useEffect(
    () =>
      onSessionExpired(() => {
        navigate({ to: "/auth/login" });
      }),
    [navigate]
  );
  return null;
}
