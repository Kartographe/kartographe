import { Flex, Spin } from "antd";
import { $api } from "@/api/$api";
import { AccountInvitations } from "@/features/accounts/account-invitations";

export function AccountInvitationsScreen({ accountId }: { accountId: string }) {
  const accountQuery = $api.useQuery("get", "/v1/accounts/{account_id}", {
    params: { path: { account_id: accountId } },
  });
  const membership = accountQuery.data?.item.membership;

  if (accountQuery.isLoading || !membership) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 160 }}>
        <Spin />
      </Flex>
    );
  }

  return (
    <AccountInvitations
      accountId={accountId}
      canGrantOwner={membership.role === "owner"}
    />
  );
}
