// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button, Flex, Result, Spin } from "antd";
import { $api } from "@/api/$api";
import { MigrationColumnsScreen } from "@/features/databases/migrations/migration-columns-screen";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/databases/$databaseId/migrations/$migrationId"
)({
  component: MigrationPage,
});

function MigrationPage() {
  const { t } = useLingui();
  const { accountId, databaseId, migrationId } = Route.useParams();

  const migrationQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases/{database_id}/migrations/{database_migration_id}",
    {
      params: {
        path: {
          account_id: accountId,
          database_id: databaseId,
          database_migration_id: migrationId,
        },
      },
    }
  );

  if (migrationQuery.isError) {
    return (
      <Result
        extra={
          <Link
            params={{ accountId, databaseId }}
            to="/accounts/$accountId/databases/$databaseId/migrations"
          >
            <Button type="primary">{t`Retour aux migrations`}</Button>
          </Link>
        }
        status="404"
        subTitle={t`Cette migration n'existe pas ou n'est plus accessible.`}
        title={t`Migration introuvable`}
      />
    );
  }

  const migration = migrationQuery.data?.item;

  if (!migration) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 240 }}>
        <Spin />
      </Flex>
    );
  }

  return (
    <MigrationColumnsScreen
      accountId={accountId}
      databaseId={databaseId}
      migration={migration}
    />
  );
}
