// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { Empty, Flex, Spin, Typography } from "antd";
import { $api } from "@/api/$api";

export const Route = createFileRoute("/_app/accounts/$accountId/")({
  component: AccountDashboard,
});

function AccountDashboard() {
  const { t } = useLingui();
  const { accountId } = Route.useParams();
  const accountQuery = $api.useQuery("get", "/v1/accounts/{account_id}", {
    params: { path: { account_id: accountId } },
  });
  const account = accountQuery.data?.item;

  if (accountQuery.isLoading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 240 }}>
        <Spin />
      </Flex>
    );
  }

  return (
    <Flex gap={24} vertical>
      <Typography.Title level={2} style={{ margin: 0 }}>
        {account?.name ?? t`Tableau de bord`}
      </Typography.Title>
      <Empty description={t`Le tableau de bord arrive bientôt`} />
    </Flex>
  );
}
