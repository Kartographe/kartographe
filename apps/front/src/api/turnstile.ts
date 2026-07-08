/**
 * The `/auth/*` endpoints have no session yet, so they accept the Cloudflare
 * Turnstile token in the `Authorization: Bearer` slot. Spread these headers on
 * every auth request made through `fetchClient`.
 */
export function turnstileHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
