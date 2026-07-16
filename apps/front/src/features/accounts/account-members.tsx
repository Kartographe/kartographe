// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import type { TableProps } from "antd";
import { App, Button, Flex, Select, Space, Table, Tag, Typography } from "antd";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { dtoEnums } from "@/api/generated/schema.enums";
import { actionsWidth, COL, scrollX } from "@/components/table/columns";
import { AccountRoleTag } from "@/features/accounts/account-role-tag";
import {
  MEMBERSHIP_TYPE_LABELS,
  ROLE_LABELS,
} from "@/features/accounts/labels";

type Member = components["schemas"]["AccountUserItem"];
type Role = components["schemas"]["AccountUserRole"];

interface AccountMembersProps {
  accountId: string;
  myRole: Role;
  myMembershipId: string;
}

export function AccountMembers({
  accountId,
  myRole,
  myMembershipId,
}: AccountMembersProps) {
  const { t } = useLingui();
  const { modal } = App.useApp();
  const queryClient = useQueryClient();

  const isAdmin = myRole === "owner" || myRole === "administrator";

  const membersQuery = $api.useQuery("get", "/v1/accounts/{account_id}/users", {
    params: { path: { account_id: accountId } },
  });
  const updateRoleMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/users/{account_user_id}",
    { meta: { successMessage: t`Rôle mis à jour` } }
  );
  const removeMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/users/{account_user_id}",
    { meta: { successMessage: t`Membre retiré` } }
  );

  const members = membersQuery.data?.items ?? [];
  const activeOwnerCount = members.filter(
    (member) => member.role === "owner" && member.status === "active"
  ).length;

  function invalidate() {
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/users"],
    });
  }

  const roleOptions = dtoEnums.AccountUserRole.filter(
    (value) => myRole === "owner" || value !== "owner"
  ).map((value) => ({ value, label: t(ROLE_LABELS[value]) }));

  async function changeRole(member: Member, role: Role) {
    await updateRoleMutation.mutateAsync({
      params: { path: { account_id: accountId, account_user_id: member.id } },
      body: { role },
    });
    invalidate();
  }

  function confirmRemove(member: Member) {
    modal.confirm({
      title: t`Retirer ${member.user.email} ?`,
      content: t`Ce membre perdra immédiatement l'accès au compte.`,
      okText: t`Retirer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await removeMutation.mutateAsync({
          params: {
            path: { account_id: accountId, account_user_id: member.id },
          },
        });
        invalidate();
      },
    });
  }

  const columns: TableProps<Member>["columns"] = [
    {
      title: t`Membre`,
      dataIndex: ["user", "email"],
      sorter: (a, b) => a.user.email.localeCompare(b.user.email),
      width: COL.email,
      render: (_, member) => {
        const name = [member.user.firstName, member.user.lastName]
          .filter(Boolean)
          .join(" ");
        return (
          <Flex vertical>
            <Typography.Text ellipsis strong>
              {name || member.user.email}
              {member.id === myMembershipId ? (
                <Tag style={{ marginInlineStart: 8 }}>{t`Vous`}</Tag>
              ) : null}
            </Typography.Text>
            {name ? (
              <Typography.Text
                ellipsis
                style={{ fontSize: 12 }}
                type="secondary"
              >
                {member.user.email}
              </Typography.Text>
            ) : null}
          </Flex>
        );
      },
    },
    {
      // Wider than `COL.role`: this cell holds the inline role `Select`
      // (`minWidth: 160`), not just a tag.
      title: t`Rôle`,
      dataIndex: "role",
      width: COL.text,
      filters: dtoEnums.AccountUserRole.map((value) => ({
        text: t(ROLE_LABELS[value]),
        value,
      })),
      onFilter: (value, member) => member.role === value,
      render: (role: Role, member) => {
        const canEdit =
          isAdmin &&
          member.id !== myMembershipId &&
          !(role === "owner" && activeOwnerCount <= 1);
        if (!canEdit) {
          return <AccountRoleTag role={role} />;
        }
        return (
          <Select
            loading={updateRoleMutation.isPending}
            onChange={(value: Role) => changeRole(member, value)}
            options={roleOptions}
            size="small"
            style={{ minWidth: 160 }}
            value={role}
          />
        );
      },
    },
    {
      title: t`Type`,
      dataIndex: "type",
      width: COL.type,
      ellipsis: true,
      filters: [
        { text: t(MEMBERSHIP_TYPE_LABELS.creator), value: "creator" },
        { text: t(MEMBERSHIP_TYPE_LABELS.guest), value: "guest" },
      ],
      onFilter: (value, member) => member.type === value,
      render: (type: Member["type"]) => t(MEMBERSHIP_TYPE_LABELS[type]),
    },
    {
      title: "",
      key: "actions",
      align: "right",
      fixed: "right",
      width: actionsWidth({ labelled: 1 }),
      render: (_, member) => {
        const canRemove =
          isAdmin &&
          member.id !== myMembershipId &&
          !(member.role === "owner" && activeOwnerCount <= 1);
        return canRemove ? (
          <Space>
            <Button danger onClick={() => confirmRemove(member)} size="small">
              {t`Retirer`}
            </Button>
          </Space>
        ) : null;
      },
    },
  ];

  return (
    <Table<Member>
      columns={columns}
      dataSource={members}
      loading={membersQuery.isLoading}
      pagination={{
        defaultPageSize: 25,
        hideOnSinglePage: true,
        pageSizeOptions: [10, 25, 50, 100],
        showSizeChanger: true,
      }}
      rowKey="id"
      scroll={scrollX(columns)}
      size="small"
    />
  );
}
