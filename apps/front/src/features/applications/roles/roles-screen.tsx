import { PlusOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { App, Button, Empty, Flex, Table, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
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
  const activateMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/applications/{application_id}/roles/{role_id}/activate",
    { meta: { successMessage: t`Rôle activé` } }
  );
  const archiveMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/applications/{application_id}/roles/{role_id}/archive",
    { meta: { successMessage: t`Rôle archivé` } }
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

  async function toggleStatus(role: Role) {
    const params = { path: { ...path, role_id: role.id } };
    if (role.status === "archived") {
      await activateMutation.mutateAsync({ params });
    } else {
      await archiveMutation.mutateAsync({ params });
    }
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
          columns={[
            {
              title: t`Titre`,
              dataIndex: "title",
              render: (title: string) => (
                <Typography.Text strong>{title}</Typography.Text>
              ),
            },
            {
              title: t`Description`,
              dataIndex: "description",
              render: (description: Role["description"]) =>
                richTextToPlainText(description) || "—",
            },
            {
              title: t`Statut`,
              dataIndex: "status",
              render: (status: Role["status"]) => (
                <ApplicationStatusTag status={status} />
              ),
            },
            {
              title: t`Créé le`,
              dataIndex: "date",
              render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
            },
            {
              title: "",
              key: "actions",
              align: "right",
              render: (_, role) => (
                <RowActions
                  archived={role.status === "archived"}
                  onDelete={() => confirmDelete(role)}
                  onEdit={() => {
                    setEditing(role);
                    setFormOpen(true);
                  }}
                  onToggleStatus={() => toggleStatus(role)}
                />
              ),
            },
          ]}
          dataSource={roles}
          loading={rolesQuery.isLoading}
          pagination={{ hideOnSinglePage: true, pageSize: 25 }}
          rowKey="id"
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
