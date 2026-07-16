// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { Flex, Spin, Typography } from "antd";
import { $api } from "@/api/$api";
import { AccountMembers } from "@/features/accounts/account-members";

export function AccountMembersScreen({ accountId }: { accountId: string }) {
  const { t } = useLingui();
  const accountQuery = $api.useQuery("get", "/v1/accounts/{account_id}", {
    params: { path: { account_id: accountId } },
  });
  const membership = accountQuery.data?.item.membership;

  return (
    <Flex gap={16} vertical>
      <Typography.Title level={3} style={{ margin: 0 }}>
        {t`Membres`}
      </Typography.Title>
      {accountQuery.isLoading || !membership ? (
        <Flex align="center" justify="center" style={{ minHeight: 160 }}>
          <Spin />
        </Flex>
      ) : (
        <AccountMembers
          accountId={accountId}
          myMembershipId={membership.id}
          myRole={membership.role}
        />
      )}
    </Flex>
  );
}
