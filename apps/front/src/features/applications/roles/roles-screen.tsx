// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { PlusOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import type { TableProps } from "antd";
import { App, Button, Empty, Flex, Table, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { actionsWidth, COL, scrollX } from "@/components/table/columns";
import { ApplicationStatusTag } from "@/features/applications/application-tags";
import { RoleFormModal } from "@/features/applications/roles/role-form-modal";
import { RowActions } from "@/features/applications/row-actions";
import { richTextToPlainText } from "@/lib/rich-text/rich-text";

type Role = components["schemas"]["ApplicationRoleItem"];

const LIST_KEY = [
  "get",
  "/v1/accounts/{account_id}/applications/{application_id}/roles",
];

export function RolesScreen({
  accountId,
  applicationId,
}: {
  accountId: string;
  applicationId: string;
}) {
  const { t } = useLingui();
  const { modal } = App.useApp();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Role | undefined>(undefined);

  const path = { account_id: accountId, application_id: applicationId };

  const rolesQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/applications/{application_id}/roles",
    { params: { path } }
  );
  const statusMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/applications/{application_id}/roles/{role_id}",
    { meta: { successMessage: t`Statut mis à jour` } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/applications/{application_id}/roles/{role_id}",
    { meta: { successMessage: t`Rôle supprimé` } }
  );

  const roles = rolesQuery.data?.items ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
  }

  async function changeStatus(role: Role, status: Role["status"]) {
    await statusMutation.mutateAsync({
      params: { path: { ...path, role_id: role.id } },
      body: { status },
    });
    invalidate();
  }

  function confirmDelete(role: Role) {
    modal.confirm({
      title: t`Supprimer ${role.title} ?`,
      content: t`Les routes rattachées à ce rôle ne le référenceront plus.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: { ...path, role_id: role.id } },
        });
        invalidate();
      },
    });
  }

  const columns: TableProps<Role>["columns"] = [
    {
      title: t`Titre`,
      dataIndex: "title",
      width: COL.title,
      ellipsis: true,
      render: (title: string) => (
        <Typography.Text strong>{title}</Typography.Text>
      ),
    },
    {
      title: t`Description`,
      dataIndex: "description",
      width: COL.description,
      ellipsis: true,
      render: (description: Role["description"]) =>
        richTextToPlainText(description) || "—",
    },
    {
      title: t`Statut`,
      dataIndex: "status",
      width: COL.status,
      render: (status: Role["status"], role) => (
        <ApplicationStatusTag
          loading={statusMutation.isPending}
          onChange={(next) => changeStatus(role, next)}
          status={status}
        />
      ),
    },
    {
      title: t`Créé le`,
      hidden: true,
      dataIndex: "date",
      width: COL.date,
      render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
    },
    {
      title: "",
      key: "actions",
      align: "right",
      fixed: "right",
      width: actionsWidth({ icons: 2 }),
      render: (_, role) => (
        <RowActions
          onDelete={() => confirmDelete(role)}
          onEdit={() => {
            setEditing(role);
            setFormOpen(true);
          }}
        />
      ),
    },
  ];

  return (
    <Flex gap={16} vertical>
      <Flex align="center" justify="space-between">
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t`Rôles`}
        </Typography.Title>
        <Button
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
          type="primary"
        >
          {t`Créer un rôle`}
        </Button>
      </Flex>

      {roles.length === 0 && !rolesQuery.isLoading ? (
        <Empty description={t`Aucun rôle`} />
      ) : (
        <Table<Role>
          columns={columns}
          dataSource={roles}
          loading={rolesQuery.isLoading}
          pagination={{ hideOnSinglePage: true, pageSize: 25 }}
          rowKey="id"
          scroll={scrollX(columns)}
          size="small"
        />
      )}

      <RoleFormModal
        accountId={accountId}
        applicationId={applicationId}
        key={editing?.id ?? "create"}
        onClose={() => setFormOpen(false)}
        open={formOpen}
        role={editing}
      />
    </Flex>
  );
}
