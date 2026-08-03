// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useQueryClient } from "@tanstack/react-query";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";

const ME_PATH = "/v1/accounts/{account_id}/me";
const PREFERENCES_PATH = "/v1/accounts/{account_id}/me/preferences";

interface MeResponse {
  item: components["schemas"]["AccountUserMeItem"];
}

/**
 * The caller's UI preferences on an account — the free-form key/value map
 * carried by their seat (`AccountUser.preferences`).
 *
 * `setPreference` writes a single key server-side and patches the cached `/me`
 * payload with the map the API returns, so a component remounting later reads
 * the fresh value without a round-trip. Failures stay silent (`noErrorToast`):
 * losing a view preference must never interrupt what the user was doing.
 */
export function useAccountPreferences(accountId: string) {
  const queryClient = useQueryClient();
  const init = { params: { path: { account_id: accountId } } };

  const meQuery = $api.useQuery("get", ME_PATH, init);
  const { queryKey } = $api.queryOptions("get", ME_PATH, init);
  const mutation = $api.useMutation("post", PREFERENCES_PATH, {
    meta: { noErrorToast: true },
  });

  function setPreference(key: string, value: unknown) {
    mutation.mutate(
      { body: { key, value }, params: { path: { account_id: accountId } } },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(queryKey, (previous?: MeResponse) =>
            previous
              ? {
                  ...previous,
                  item: {
                    ...previous.item,
                    preferences: data.item.preferences,
                  },
                }
              : previous
          );
        },
      }
    );
  }

  return {
    /** Preferences resolved (or definitively unavailable) — safe to read. */
    loaded: !meQuery.isPending,
    preferences: meQuery.data?.item.preferences ?? {},
    setPreference,
  };
}
