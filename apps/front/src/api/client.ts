import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "@/api/generated/schema";
import { emitSessionExpired } from "@/lib/auth/auth-events";
import { emitForbidden } from "@/lib/auth/forbidden-events";
import { requestTokenRefresh } from "@/lib/auth/refresh";
import {
  clearSession,
  isAccessUsable,
  isRefreshUsable,
  loadSession,
  updateSession,
} from "@/lib/auth/token-storage";
import { env } from "@/lib/env/env";

export const fetchClient = createClient<paths>({
  baseUrl: env.VITE_API_URL,
  credentials: "include",
});

// Endpoints that must NOT carry the session bearer: the auth surface issues /
// refreshes tokens (and `/auth/*` carries the Turnstile token in that slot),
// and the health probe is public.
const PUBLIC_PREFIXES = ["/auth/", "/health"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// Single-flight guard: concurrent requests that all find an expired token share
// one refresh call instead of stampeding the refresh endpoint.
let refreshInFlight: Promise<string | null> | null = null;

async function ensureFreshAccessToken(): Promise<string | null> {
  const session = loadSession();
  if (isAccessUsable(session)) {
    return session?.accessToken ?? null;
  }
  if (!isRefreshUsable(session)) {
    return null;
  }
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const item = await requestTokenRefresh(session?.refreshToken ?? "");
        return updateSession(item)?.accessToken ?? null;
      } catch {
        clearSession();
        emitSessionExpired("expired");
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  const token = await refreshInFlight;
  return token;
}

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const { pathname } = new URL(request.url);
    if (isPublic(pathname)) {
      return request;
    }
    const token = await ensureFreshAccessToken();
    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }
    return request;
  },
  onResponse({ request, response }) {
    const { pathname } = new URL(request.url);
    if (isPublic(pathname)) {
      return response;
    }
    if (response.status === 401) {
      clearSession();
      emitSessionExpired("expired");
    }
    // A forbidden *read* means the page itself is out of reach — bounce home.
    // Writes are left alone: a denied action should surface as an error on the
    // screen the user is on, not yank them away from it.
    if (response.status === 403 && request.method === "GET") {
      emitForbidden();
    }
    return response;
  },
};

fetchClient.use(authMiddleware);
