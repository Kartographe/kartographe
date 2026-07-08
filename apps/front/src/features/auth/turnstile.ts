import { env } from "@/lib/env/env";

/**
 * Turnstile is "active" only when a site key is configured. When inactive the
 * widget renders nothing and the auth forms submit freely; when active a token
 * is required (enforced in each form's submit handler).
 */
export function isTurnstileEnabled(): boolean {
  return Boolean(env.VITE_TURNSTILE_SITE_KEY);
}
