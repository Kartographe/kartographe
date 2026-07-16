// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { PlusOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { App, Button, Empty, Flex, Space, Table, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { dtoEnums } from "@/api/generated/schema.enums";
import { AccountRoleTag } from "@/features/accounts/account-role-tag";
import { InviteMembersModal } from "@/features/accounts/invite-members-modal";
import { INVITATION_STATUS_LABELS } from "@/features/accounts/labels";
import { InvitationStatusTag } from "@/features/accounts/status-tags";

type Invitation = components["schemas"]["AccountInvitationItem"];

interface AccountInvitationsProps {
  accountId: string;
  canGrantOwner: boolean;
}

export function AccountInvitations({
  accountId,
  canGrantOwner,
}: AccountInvitationsProps) {
  const { t } = useLingui();
  const { modal } = App.useApp();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);

  const invitationsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/invitations",
    { params: { path: { account_id: accountId } } }
  );
  const resendMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/invitations/{invitation_id}/resend",
    { meta: { successMessage: t`Invitation renvoyée` } }
  );
  const cancelMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/invitations/{invitation_id}",
    { meta: { successMessage: t`Invitation annulée` } }
  );

  const invitations = invitationsQuery.data?.items ?? [];

  function invalidate() {
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/invitations"],
    });
  }

  async function resend(invitation: Invitation) {
    await resendMutation.mutateAsync({
      params: { path: { account_id: accountId, invitation_id: invitation.id } },
    });
    invalidate();
  }

  function confirmCancel(invitation: Invitation) {
    modal.confirm({
      title: t`Annuler l'invitation de ${invitation.email} ?`,
      okText: t`Annuler l'invitation`,
      okButtonProps: { danger: true },
      cancelText: t`Fermer`,
      onOk: async () => {
        await cancelMutation.mutateAsync({
          params: {
            path: { account_id: accountId, invitation_id: invitation.id },
          },
        });
        invalidate();
      },
    });
  }

  return (
    <Flex gap={16} vertical>
      <Flex align="center" justify="space-between">
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t`Invitations`}
        </Typography.Title>
        <Button
          icon={<PlusOutlined />}
          onClick={() => setInviteOpen(true)}
          type="primary"
        >
          {t`Inviter`}
        </Button>
      </Flex>

      {invitations.length === 0 && !invitationsQuery.isLoading ? (
        <Empty description={t`Aucune invitation`} />
      ) : (
        <Table<Invitation>
          columns={[
            {
              title: t`Email`,
              dataIndex: "email",
              sorter: (a, b) => a.email.localeCompare(b.email),
              render: (email: string) => (
                <Typography.Text>{email}</Typography.Text>
              ),
            },
            {
              title: t`Rôle`,
              dataIndex: "role",
              render: (role: Invitation["role"]) => (
                <AccountRoleTag role={role} />
              ),
            },
            {
              title: t`Statut`,
              dataIndex: "status",
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
              title: t`Expire le`,
              dataIndex: "expireDate",
              sorter: (a, b) =>
                new Date(a.expireDate ?? 0).getTime() -
                new Date(b.expireDate ?? 0).getTime(),
              render: (value: string | null) =>
                value ? dayjs(value).format("DD/MM/YYYY") : "—",
            },
            {
              title: "",
              key: "actions",
              render: (_, invitation) => (
                <Space>
                  {invitation.status === "standby" ||
                  invitation.status === "expired" ? (
                    <Button
                      loading={resendMutation.isPending}
                      onClick={() => resend(invitation)}
                      size="small"
                    >
                      {t`Renvoyer`}
                    </Button>
                  ) : null}
                  {invitation.status === "standby" ? (
                    <Button
                      danger
                      onClick={() => confirmCancel(invitation)}
                      size="small"
                    >
                      {t`Annuler`}
                    </Button>
                  ) : null}
                </Space>
              ),
            },
          ]}
          dataSource={invitations}
          loading={invitationsQuery.isLoading}
          pagination={{
            defaultPageSize: 25,
            hideOnSinglePage: true,
            pageSizeOptions: [10, 25, 50, 100],
            showSizeChanger: true,
          }}
          rowKey="id"
          size="small"
        />
      )}

      <InviteMembersModal
        accountId={accountId}
        canGrantOwner={canGrantOwner}
        onClose={() => setInviteOpen(false)}
        open={inviteOpen}
      />
    </Flex>
  );
}
