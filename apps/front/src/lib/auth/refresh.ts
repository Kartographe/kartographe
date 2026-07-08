import type { components } from "@/api/generated/schema";
import { env } from "@/lib/env/env";

type TokenItem = components["schemas"]["TokenItem"];

/**
 * Refresh the access token with a raw `fetch`, deliberately bypassing the
 * openapi-fetch client so the request/refresh middleware can't re-enter itself
 * (which would deadlock while a refresh is already in flight).
 */
export async function requestTokenRefresh(
  refreshToken: string
): Promise<TokenItem> {
  const response = await fetch(`${env.VITE_API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ grantType: "refresh_token", refreshToken }),
  });
  if (!response.ok) {
    throw new Error(`Refresh failed with status ${response.status}`);
  }
  const payload = (await response.json()) as { item: TokenItem };
  return payload.item;
}
