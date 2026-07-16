// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Button, Flex, Result, Spin } from "antd";
import { $api } from "@/api/$api";
import { DatabaseSideNav } from "@/features/databases/database-side-nav";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/databases/$databaseId"
)({
  component: DatabaseLayout,
});

function DatabaseLayout() {
  const { t } = useLingui();
  const { accountId, databaseId } = Route.useParams();

  const databaseQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases/{database_id}",
    { params: { path: { account_id: accountId, database_id: databaseId } } }
  );

  if (databaseQuery.isLoading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 240 }}>
        <Spin />
      </Flex>
    );
  }

  if (databaseQuery.isError) {
    return (
      <Result
        extra={
          <Link params={{ accountId }} to="/accounts/$accountId/databases">
            <Button type="primary">{t`Retour aux bases de données`}</Button>
          </Link>
        }
        status="404"
        subTitle={t`Cette base de données n'existe pas ou n'est plus accessible.`}
        title={t`Base de données introuvable`}
      />
    );
  }

  return (
    <div className="h-full overflow-hidden rounded-xl border border-(--ant-color-border-secondary) bg-(--ant-color-bg-container)">
      <div className="grid h-full grid-cols-1 grid-rows-[auto_1fr] lg:grid-cols-[220px_1fr] lg:grid-rows-[1fr]">
        <aside className="min-h-0 border-(--ant-color-border-secondary) border-b lg:border-r lg:border-b-0">
          <DatabaseSideNav accountId={accountId} databaseId={databaseId} />
        </aside>
        <main className="min-w-0 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
