// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { $api } from "@/api/$api";

/** Roles allowed to lock/unlock an entity. */
const MANAGER_ROLES = new Set(["owner", "administrator"]);

/**
 * Whether the current user may lock/unlock entities of this account — reserved
 * to owners and administrators. Reads the caller's role off the account payload
 * (already cached by the app shell), so it costs no extra round-trip.
 */
export function useCanManageLock(accountId: string): boolean {
  const accountQuery = $api.useQuery("get", "/v1/accounts/{account_id}", {
    params: { path: { account_id: accountId } },
  });
  const role = accountQuery.data?.item.membership?.role;
  return role ? MANAGER_ROLES.has(role) : false;
}
