// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { ArrowRightOutlined } from "@ant-design/icons";
import { Flex, Typography } from "antd";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import type { useVersionLookup } from "@/features/databases/migrations/use-version-lookup";

type DatabaseMigration = components["schemas"]["DatabaseMigrationItem"];

const UNRESOLVED = "…";

/**
 * The `v1.0.0 → v2.0.0` the migration is read as.
 *
 * When it lands on another database, the version alone would be ambiguous — two
 * databases each have their own `v2.0.0` — so the destination is named.
 */
export function MigrationEndpoints({
  accountId,
  databaseId,
  migration,
  versions,
}: {
  accountId: string;
  databaseId: string;
  migration: DatabaseMigration;
  versions: ReturnType<typeof useVersionLookup>;
}) {
  const isCrossDatabase = migration.destinationDatabaseId !== databaseId;

  const destinationDatabaseQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases/{database_id}",
    {
      params: {
        path: {
          account_id: accountId,
          database_id: migration.destinationDatabaseId,
        },
      },
    },
    { enabled: isCrossDatabase }
  );

  const from =
    versions.format(
      migration.sourceDatabaseId,
      migration.sourceDatabaseVersionId
    ) ?? UNRESOLVED;
  const to =
    versions.format(
      migration.destinationDatabaseId,
      migration.destinationDatabaseVersionId
    ) ?? UNRESOLVED;
  const destinationDatabase = destinationDatabaseQuery.data?.item.title;

  return (
    <Flex align="center" gap={8} style={{ minWidth: 0 }}>
      <Typography.Text>{from}</Typography.Text>
      <ArrowRightOutlined style={{ color: "var(--ant-color-text-tertiary)" }} />
      <Typography.Text ellipsis>
        {isCrossDatabase && destinationDatabase
          ? `${destinationDatabase} ${to}`
          : to}
      </Typography.Text>
    </Flex>
  );
}
