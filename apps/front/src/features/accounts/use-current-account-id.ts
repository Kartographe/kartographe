// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useParams } from "@tanstack/react-router";

/**
 * The account currently being viewed, derived from the `$accountId` route param.
 *
 * `null` on every route outside `/accounts/$accountId/*` — including `/` — so
 * the shell (sidebar nav, switcher) renders "no account selected" there rather
 * than trusting the persisted last-visited id.
 */
export function useCurrentAccountId(): string | null {
  const params = useParams({ strict: false });
  return params.accountId ?? null;
}
