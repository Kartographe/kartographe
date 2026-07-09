import { PlusOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { App, Button, Empty, Flex, Table, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import {
  ApplicationStatusTag,
  EnvironmentTypeTag,
} from "@/features/applications/application-tags";
import { EnvironmentFormModal } from "@/features/applications/environments/environment-form-modal";
import { RowActions } from "@/features/applications/row-actions";

type Environment = components["schemas"]["ApplicationEnvironmentItem"];

const LIST_KEY = [
  "get",
  "/v1/accounts/{account_id}/applications/{application_id}/environments",
];

export function EnvironmentsScreen({
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
  const [editing, setEditing] = useState<Environment | undefined>(undefined);

  const path = { account_id: accountId, application_id: applicationId };

  const environmentsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/applications/{application_id}/environments",
    { params: { path } }
  );
  const activateMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/applications/{application_id}/environments/{environment_id}/activate",
    { meta: { successMessage: t`Environnement activé` } }
  );
  const archiveMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/applications/{application_id}/environments/{environment_id}/archive",
    { meta: { successMessage: t`Environnement archivé` } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/applications/{application_id}/environments/{environment_id}",
    { meta: { successMessage: t`Environnement supprimé` } }
  );

  const environments = environmentsQuery.data?.items ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
  }

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  async function toggleStatus(environment: Environment) {
    const params = { path: { ...path, environment_id: environment.id } };
    if (environment.status === "active") {
      await archiveMutation.mutateAsync({ params });
    } else {
      await activateMutation.mutateAsync({ params });
    }
    invalidate();
  }

  function confirmDelete(environment: Environment) {
    modal.confirm({
      title: t`Supprimer ${environment.title} ?`,
      content: t`Les déploiements associés seront également perdus.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: { ...path, environment_id: environment.id } },
        });
        invalidate();
      },
    });
  }

  const formModal = (
    <EnvironmentFormModal
      accountId={accountId}
      applicationId={applicationId}
      environment={editing}
      key={editing?.id ?? "create"}
      onClose={() => setFormOpen(false)}
      open={formOpen}
    />
  );

  return (
    <Flex gap={16} vertical>
      <Flex align="center" justify="space-between">
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t`Environnements`}
        </Typography.Title>
        <Button icon={<PlusOutlined />} onClick={openCreate} type="primary">
          {t`Créer un environnement`}
        </Button>
      </Flex>

      {environments.length === 0 && !environmentsQuery.isLoading ? (
        <Empty description={t`Aucun environnement`} />
      ) : (
        <Table<Environment>
          columns={[
            {
              title: t`Titre`,
              dataIndex: "title",
              render: (title: string) => (
                <Typography.Text strong>{title}</Typography.Text>
              ),
            },
            {
              title: t`Type`,
              dataIndex: "type",
              render: (type: Environment["type"]) => (
                <EnvironmentTypeTag type={type} />
              ),
            },
            {
              title: t`URL`,
              dataIndex: "url",
              render: (url: string | null) =>
                url ? (
                  <Typography.Link href={url} target="_blank">
                    {url}
                  </Typography.Link>
                ) : (
                  "—"
                ),
            },
            {
              title: t`Statut`,
              dataIndex: "status",
              render: (status: Environment["status"]) => (
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
              render: (_, environment) => (
                <RowActions
                  active={environment.status === "active"}
                  onDelete={() => confirmDelete(environment)}
                  onEdit={() => {
                    setEditing(environment);
                    setFormOpen(true);
                  }}
                  onToggleStatus={() => toggleStatus(environment)}
                />
              ),
            },
          ]}
          dataSource={environments}
          loading={environmentsQuery.isLoading}
          pagination={{ hideOnSinglePage: true, pageSize: 25 }}
          rowKey="id"
          size="small"
        />
      )}

      {formModal}
    </Flex>
  );
}
