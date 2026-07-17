// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { PlusOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import type { TableProps } from "antd";
import { App, Button, Empty, Flex, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { actionsWidth, COL, scrollX } from "@/components/table/columns";
import {
  ApplicationStatusTag,
  VersionTypeTag,
} from "@/features/applications/application-tags";
import { RowActions } from "@/features/applications/row-actions";
import { formatVersion } from "@/features/applications/version";
import { VersionFormModal } from "@/features/applications/versions/version-form-modal";

type Version = components["schemas"]["ApplicationVersionItem"];

const LIST_KEY = [
  "get",
  "/v1/accounts/{account_id}/applications/{application_id}/versions",
];

export function VersionsScreen({
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
  const [editing, setEditing] = useState<Version | undefined>(undefined);

  const path = { account_id: accountId, application_id: applicationId };

  const versionsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/applications/{application_id}/versions",
    { params: { path } }
  );
  const activateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/applications/{application_id}/versions/{version_id}",
    { meta: { successMessage: t`Version activée` } }
  );
  const archiveMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/applications/{application_id}/versions/{version_id}",
    { meta: { successMessage: t`Version archivée` } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/applications/{application_id}/versions/{version_id}",
    { meta: { successMessage: t`Version supprimée` } }
  );

  const versions = versionsQuery.data?.items ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
  }

  async function toggleStatus(version: Version) {
    const params = { path: { ...path, version_id: version.id } };
    if (version.status === "active") {
      await archiveMutation.mutateAsync({
        params,
        body: { status: "archived" },
      });
    } else {
      await activateMutation.mutateAsync({
        params,
        body: { status: "active" },
      });
    }
    invalidate();
  }

  function confirmDelete(version: Version) {
    modal.confirm({
      title: t`Supprimer la version ${formatVersion(version.version)} ?`,
      content: t`Cette action est irréversible.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: { ...path, version_id: version.id } },
        });
        invalidate();
      },
    });
  }

  const columns: TableProps<Version>["columns"] = [
    {
      title: t`Version`,
      dataIndex: "version",
      width: COL.text,
      render: (value: number[]) => <Tag>{formatVersion(value)}</Tag>,
    },
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
      render: (type: Version["type"]) => <VersionTypeTag type={type} />,
    },
    {
      title: t`Statut`,
      dataIndex: "status",
      width: COL.status,
      render: (status: Version["status"]) => (
        <ApplicationStatusTag status={status} />
      ),
    },
    {
      title: t`Créée le`,
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
      render: (_, version) => (
        <RowActions
          active={version.status === "active"}
          onDelete={() => confirmDelete(version)}
          onEdit={() => {
            setEditing(version);
            setFormOpen(true);
          }}
          onToggleStatus={() => toggleStatus(version)}
        />
      ),
    },
  ];

  return (
    <Flex gap={16} vertical>
      <Flex align="center" justify="space-between">
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t`Versions`}
        </Typography.Title>
        <Button
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
          type="primary"
        >
          {t`Créer une version`}
        </Button>
      </Flex>

      {versions.length === 0 && !versionsQuery.isLoading ? (
        <Empty description={t`Aucune version`} />
      ) : (
        <Table<Version>
          columns={columns}
          dataSource={versions}
          loading={versionsQuery.isLoading}
          pagination={{ hideOnSinglePage: true, pageSize: 25 }}
          rowKey="id"
          scroll={scrollX(columns)}
          size="small"
        />
      )}

      <VersionFormModal
        accountId={accountId}
        applicationId={applicationId}
        key={editing?.id ?? "create"}
        onClose={() => setFormOpen(false)}
        open={formOpen}
        version={editing}
      />
    </Flex>
  );
}
