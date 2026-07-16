// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { components } from "@/api/generated/schema";

type TokenItem = components["schemas"]["TokenItem"];

/**
 * The session the app manages itself: bearer access + refresh tokens with
 * absolute (epoch-ms) expiries. Persisted to `localStorage` when the user ticks
 * "remember me", otherwise to `sessionStorage` (cleared when the tab closes).
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

function storageFor(remember: boolean): Storage {
  return remember ? window.localStorage : window.sessionStorage;
}

export function loadSession(): StoredSession | null {
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
  // Write to the chosen store, wipe the other so only one copy ever exists.
  storageFor(!remember).removeItem(STORAGE_KEY);
  storageFor(remember).setItem(STORAGE_KEY, JSON.stringify(session));
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
