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

  const columns: TableProps<Environment>["columns"] = [
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
      title: t`Type`,
      dataIndex: "type",
      width: COL.type,
      render: (type: Environment["type"]) => <EnvironmentTypeTag type={type} />,
    },
    {
      title: t`URL`,
      dataIndex: "url",
      width: COL.url,
      ellipsis: true,
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
      width: COL.status,
      render: (status: Environment["status"]) => (
        <ApplicationStatusTag status={status} />
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
      width: actionsWidth({ icons: 3 }),
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
  ];

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
          columns={columns}
          dataSource={environments}
          loading={environmentsQuery.isLoading}
          pagination={{ hideOnSinglePage: true, pageSize: 25 }}
          rowKey="id"
          scroll={scrollX(columns)}
          size="small"
        />
      )}

      {formModal}
    </Flex>
  );
}
