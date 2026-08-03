// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { components } from "@/api/generated/schema";

type TokenItem = components["schemas"]["TokenItem"];

/**
 * The session the app manages itself: bearer access + refresh tokens with
 * absolute (epoch-ms) expiries.
 *
 * Always persisted to `localStorage`, so every tab of the app shares one
 * session — `sessionStorage` is per-tab, and a session kept there made any
 * newly opened tab look signed out. "Remember me" is not a storage choice: the
 * API already encodes it in the refresh token's lifetime (a day without it, a
 * week with), which is what actually bounds the session.
 */
export interface StoredSession {
  accessToken: string;
  refreshToken: string | null;
  accessExpiresAt: number;
  refreshExpiresAt: number | null;
  remember: boolean;
}

const STORAGE_KEY = "kartographe-session";
// Treat a token as unusable this many ms before its real expiry, to absorb
// clock skew and in-flight request latency.
const EXPIRY_SKEW_MS = 30_000;

export function loadSession(): StoredSession | null {
  // `sessionStorage` is still read so a session written by a previous build
  // keeps working; it is migrated to `localStorage` on the next save.
  for (const store of [window.localStorage, window.sessionStorage]) {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) {
      continue;
    }
    try {
      return JSON.parse(raw) as StoredSession;
    } catch {
      store.removeItem(STORAGE_KEY);
    }
  }
  return null;
}

export function saveSession(item: TokenItem, remember: boolean): StoredSession {
  const now = Date.now();
  const session: StoredSession = {
    accessToken: item.accessToken,
    refreshToken: item.refreshToken ?? null,
    accessExpiresAt: now + item.expiresIn * 1000,
    refreshExpiresAt: item.refreshTokenExpiresIn
      ? now + item.refreshTokenExpiresIn * 1000
      : null,
    remember,
  };
  // One copy, shared by every tab.
  window.sessionStorage.removeItem(STORAGE_KEY);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function updateSession(item: TokenItem): StoredSession | null {
  const current = loadSession();
  if (!current) {
    return null;
  }
  return saveSession(item, current.remember);
}

export function clearSession(): void {
  window.localStorage.removeItem(STORAGE_KEY);
  window.sessionStorage.removeItem(STORAGE_KEY);
}

export function isAccessUsable(session: StoredSession | null): boolean {
  return !!session && session.accessExpiresAt - EXPIRY_SKEW_MS > Date.now();
}

export function isRefreshUsable(session: StoredSession | null): boolean {
  return (
    !!session &&
    !!session.refreshToken &&
    (session.refreshExpiresAt ?? 0) - EXPIRY_SKEW_MS > Date.now()
  );
}
