// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Sibling of `auth-events` for the "signed in, but not allowed here" case: a
 * 403 on a resource the user can't reach (a foreign account, a page above their
 * role). Same split of concerns — the API layer detects it, the router reacts by
 * sending the user back to the dashboard.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

export function onForbidden(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitForbidden(): void {
  for (const listener of listeners) {
    listener();
  }
}
