// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { $api } from "@/api/$api";

/** The signed-in user's profile, cached under the `/me` query key. */
export function useCurrentUser() {
  return $api.useQuery("get", "/me");
}
