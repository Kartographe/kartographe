// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useQueries } from "@tanstack/react-query";
import { $api } from "@/api/$api";
import { formatVersion } from "@/features/databases/labels";

/**
 * Resolves the version ids a migration carries into the `v1.2.0` labels they
 * are read as.
 *
 * A migration leaves a version of the database in the path but may land on a
 * version of *any* database of the account, so the versions to resolve are
 * spread across several databases — one listing query each. Ids are looked up
 * per database because a version id is only unique within its own database's
 * listing.
 */
export function useVersionLookup(accountId: string, databaseIds: string[]) {
  // Same database twice (the common single-database migration) is one query.
  const uniqueIds = [...new Set(databaseIds)];

  const queries = useQueries({
    queries: uniqueIds.map((databaseId) =>
      $api.queryOptions(
        "get",
        "/v1/accounts/{account_id}/databases/{database_id}/versions",
        { params: { path: { account_id: accountId, database_id: databaseId } } }
      )
    ),
  });

  const byDatabase = new Map<string, Map<string, string>>();
  uniqueIds.forEach((databaseId, index) => {
    const versions = queries[index]?.data?.items ?? [];
    byDatabase.set(
      databaseId,
      new Map(
        versions.map((version) => [version.id, formatVersion(version.version)])
      )
    );
  });

  return {
    isLoading: queries.some((query) => query.isLoading),
    /** The `v1.2.0` label, or `null` while it is still loading or gone. */
    format(databaseId: string, versionId: string): string | null {
      return byDatabase.get(databaseId)?.get(versionId) ?? null;
    },
  };
}
