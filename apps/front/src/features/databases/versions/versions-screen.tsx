// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import {
  ArrowRightOutlined,
  DeleteOutlined,
  EditOutlined,
  InboxOutlined,
  PlusOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { TableProps } from "antd";
import {
  App,
  Button,
  Empty,
  Flex,
  Space,
  Table,
  Tooltip,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { actionsWidth, COL, scrollX } from "@/components/table/columns";
import { VersionStatusTag } from "@/features/databases/database-tags";
import { formatVersion } from "@/features/databases/labels";
import { VersionFormModal } from "@/features/databases/versions/version-form-modal";

type DatabaseVersion = components["schemas"]["DatabaseVersionItem"];

const LIST_KEY = [
  "get",
  "/v1/accounts/{account_id}/databases/{database_id}/versions",
];

export function VersionsScreen({
  accountId,
  databaseId,
}: {
  accountId: string;
  databaseId: string;
}) {
  const { t } = useLingui();
  const { modal } = App.useApp();
  const queryClient = useQueryClient();
  // `null` = closed, `undefined` = open in create mode.
  const [form, setForm] = useState<DatabaseVersion | undefined | null>(null);

  const path = { account_id: accountId, database_id: databaseId };

  const versionsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases/{database_id}/versions",
    { params: { path } }
  );
  const activateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}",
    { meta: { successMessage: t`Version activée` } }
  );
  const archiveMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}",
    { meta: { successMessage: t`Version archivée` } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}",
    { meta: { successMessage: t`Version supprimée` } }
  );

  const versions = versionsQuery.data?.items ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
  }

  async function toggleStatus(version: DatabaseVersion) {
    const params = { path: { ...path, database_version_id: version.id } };
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

  function confirmDelete(version: DatabaseVersion) {
    modal.confirm({
      title: t`Supprimer ${formatVersion(version.version)} ?`,
      content: t`Ses tables et colonnes seront supprimées également. Cette action est irréversible.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: { ...path, database_version_id: version.id } },
        });
        invalidate();
      },
    });
  }

  const formModal =
    form === null ? null : (
      <VersionFormModal
        accountId={accountId}
        databaseId={databaseId}
        key={form?.id ?? "create"}
        onClose={() => setForm(null)}
        open
        version={form}
      />
    );

  const columns: TableProps<DatabaseVersion>["columns"] = [
    {
      title: t`Version`,
      key: "version",
      width: COL.text,
      ellipsis: true,
      render: (_, version) => (
        <Typography.Text>{formatVersion(version.version)}</Typography.Text>
      ),
    },
    {
      title: t`Statut`,
      key: "status",
      dataIndex: "status",
      width: COL.status,
      render: (status: DatabaseVersion["status"]) => (
        <VersionStatusTag status={status} />
      ),
    },
    {
      title: t`Début`,
      key: "startDate",
      dataIndex: "startDate",
      width: COL.date,
      render: (value: string | null) =>
        value ? dayjs(value).format("DD/MM/YYYY") : "—",
    },
    {
      title: t`Fin`,
      key: "endDate",
      dataIndex: "endDate",
      width: COL.date,
      render: (value: string | null) =>
        value ? dayjs(value).format("DD/MM/YYYY") : "—",
    },
    {
      title: t`Créée le`,
      hidden: true,
      key: "date",
      dataIndex: "date",
      width: COL.date,
      render: (value: string | null) =>
        value ? dayjs(value).format("DD/MM/YYYY") : "—",
    },
    {
      title: "",
      key: "actions",
      align: "right",
      fixed: "right",
      width: actionsWidth({ icons: 3, labelled: 1 }),
      render: (_, version) => (
        <Space>
          <Link
            params={{ accountId, databaseId, versionId: version.id }}
            to="/accounts/$accountId/databases/$databaseId/versions/$versionId"
          >
            <Button
              icon={<ArrowRightOutlined />}
              iconPosition="end"
              size="small"
            >
              {t`Accéder`}
            </Button>
          </Link>
          <Tooltip title={t`Modifier`}>
            <Button
              icon={<EditOutlined />}
              onClick={() => setForm(version)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={version.status === "active" ? t`Archiver` : t`Activer`}
          >
            <Button
              icon={
                version.status === "active" ? (
                  <InboxOutlined />
                ) : (
                  <RocketOutlined />
                )
              }
              onClick={() => toggleStatus(version)}
              size="small"
            />
          </Tooltip>
          <Tooltip title={t`Supprimer`}>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => confirmDelete(version)}
              size="small"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (!versionsQuery.isLoading && versions.length === 0) {
    return (
      <Flex gap={16} vertical>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t`Versions`}
        </Typography.Title>
        <Empty
          description={t`Cette base n'a aucune version. Créez-en une pour y décrire vos tables.`}
        >
          <Button
            icon={<PlusOutlined />}
            onClick={() => setForm(undefined)}
            type="primary"
          >
            {t`Créer une version`}
          </Button>
        </Empty>
        {formModal}
      </Flex>
    );
  }

  return (
    <Flex gap={16} vertical>
      <Flex align="center" justify="space-between">
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t`Versions`}
        </Typography.Title>
        <Button
          icon={<PlusOutlined />}
          onClick={() => setForm(undefined)}
          type="primary"
        >
          {t`Créer une version`}
        </Button>
      </Flex>

      <Table<DatabaseVersion>
        columns={columns}
        dataSource={versions}
        loading={versionsQuery.isLoading}
        pagination={false}
        rowKey="id"
        scroll={scrollX(columns)}
        size="small"
      />

      {formModal}
    </Flex>
  );
}
