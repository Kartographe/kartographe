// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

const KEY = "kartographe-post-login-return";

/**
 * Remember where to send the user back after login (e.g. an OAuth consent page
 * they hit while logged out). Only same-origin relative paths are stored, to
 * avoid open-redirects.
 */
export function stashPostLoginReturn(path: string): void {
  if (path.startsWith("/") && !path.startsWith("//")) {
    sessionStorage.setItem(KEY, path);
  }
}

export function consumePostLoginReturn(): string | null {
  const value = sessionStorage.getItem(KEY);
  sessionStorage.removeItem(KEY);
  return value;
}
