// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";

type TagEntityType = components["schemas"]["TagEntityType"];

/**
 * Antd column filters listing the account's tags for one entity type.
 *
 * The values are tag ids, which map straight onto the listing's `tagIds` query
 * param — the filtering itself happens server-side ("carries at least one of
 * these tags"), so it stays correct across pages.
 */
export function useTagFilters(accountId: string, entityType: TagEntityType) {
  const tagsQuery = $api.useQuery("get", "/v1/accounts/{account_id}/tags", {
    params: { path: { account_id: accountId }, query: { type: entityType } },
  });

  return (tagsQuery.data?.items ?? []).map((tag) => ({
    text: tag.label,
    value: tag.id,
  }));
}
