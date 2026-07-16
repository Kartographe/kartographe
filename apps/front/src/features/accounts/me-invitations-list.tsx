// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import type { TableProps } from "antd";
import { Button, Empty, Flex, Space, Table, Typography } from "antd";
import dayjs from "dayjs";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { dtoEnums } from "@/api/generated/schema.enums";
import { actionsWidth, COL, scrollX } from "@/components/table/columns";
import { AccountRoleTag } from "@/features/accounts/account-role-tag";
import { INVITATION_STATUS_LABELS } from "@/features/accounts/labels";
import { InvitationStatusTag } from "@/features/accounts/status-tags";

type Invitation = components["schemas"]["MeInvitationItem"];

export function MeInvitationsList() {
  const { t } = useLingui();
  const queryClient = useQueryClient();

  const invitationsQuery = $api.useQuery("get", "/me/invitations");

  const acceptMutation = $api.useMutation(
    "post",
    "/me/invitations/{invitation_id}/accept",
    { meta: { successMessage: t`Invitation acceptée` } }
  );
  const refuseMutation = $api.useMutation(
    "post",
    "/me/invitations/{invitation_id}/refuse",
    { meta: { successMessage: t`Invitation refusée` } }
  );

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["get", "/me/invitations"] });
    queryClient.invalidateQueries({ queryKey: ["get", "/v1/accounts"] });
  }

  async function accept(invitation: Invitation) {
    await acceptMutation.mutateAsync({
      params: { path: { invitation_id: invitation.id } },
    });
    invalidate();
  }

  async function refuse(invitation: Invitation) {
    await refuseMutation.mutateAsync({
      params: { path: { invitation_id: invitation.id } },
    });
    invalidate();
  }

  const invitations = invitationsQuery.data?.items ?? [];
  const pending =
    invitationsQuery.isPending ||
    acceptMutation.isPending ||
    refuseMutation.isPending;

  const columns: TableProps<Invitation>["columns"] = [
    {
      title: t`Compte`,
      dataIndex: ["account", "name"],
      width: COL.title,
      ellipsis: true,
      render: (name: string) => (
        <Typography.Text strong>{name}</Typography.Text>
      ),
    },
    {
      title: t`Rôle`,
      dataIndex: "role",
      width: COL.role,
      render: (role: Invitation["role"]) => <AccountRoleTag role={role} />,
    },
    {
      title: t`Invité par`,
      dataIndex: ["owner", "name"],
      width: COL.text,
      ellipsis: true,
      render: (name: string | null | undefined) => name ?? "—",
    },
    {
      title: t`Reçue le`,
      dataIndex: "date",
      sorter: (a, b) =>
        new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime(),
      defaultSortOrder: "descend",
      width: COL.date,
      render: (value: string | null) =>
        value ? dayjs(value).format("DD/MM/YYYY") : "—",
    },
    {
      title: t`Expire le`,
      dataIndex: "expireDate",
      width: COL.date,
      render: (value: string | null) =>
        value ? dayjs(value).format("DD/MM/YYYY") : "—",
    },
    {
      title: t`Statut`,
      dataIndex: "status",
      width: COL.status,
      filters: dtoEnums.AccountUserInvitationStatus.map((value) => ({
        text: t(INVITATION_STATUS_LABELS[value]),
        value,
      })),
      onFilter: (value, invitation) => invitation.status === value,
      render: (status: Invitation["status"]) => (
        <InvitationStatusTag status={status} />
      ),
    },
    {
      title: "",
      key: "actions",
      align: "right",
      fixed: "right",
      width: actionsWidth({ labelled: 2 }),
      render: (_, invitation) =>
        invitation.status === "standby" ? (
          <Space>
            <Button
              onClick={() => accept(invitation)}
              size="small"
              type="primary"
            >
              {t`Accepter`}
            </Button>
            <Button danger onClick={() => refuse(invitation)} size="small">
              {t`Refuser`}
            </Button>
          </Space>
        ) : null,
    },
  ];

  return (
    <Flex gap={16} vertical>
      <Typography.Title level={3} style={{ margin: 0 }}>
        {t`Invitations`}
      </Typography.Title>
      {invitations.length === 0 && !invitationsQuery.isLoading ? (
        <Empty description={t`Vous n'avez aucune invitation`} />
      ) : (
        <Table<Invitation>
          columns={columns}
          dataSource={invitations}
          loading={pending}
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
      )}
    </Flex>
  );
}
