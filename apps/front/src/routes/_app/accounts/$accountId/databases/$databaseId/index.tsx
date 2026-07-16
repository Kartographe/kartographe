// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { Flex, Spin } from "antd";
import { $api } from "@/api/$api";
import { DatabaseOverview } from "@/features/databases/database-overview";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/databases/$databaseId/"
)({
  component: DatabaseOverviewPage,
});

function DatabaseOverviewPage() {
  const { accountId, databaseId } = Route.useParams();
  const databaseQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases/{database_id}",
    { params: { path: { account_id: accountId, database_id: databaseId } } }
  );
  const database = databaseQuery.data?.item;

  if (!database) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 240 }}>
        <Spin />
      </Flex>
    );
  }

  return <DatabaseOverview accountId={accountId} database={database} />;
}
