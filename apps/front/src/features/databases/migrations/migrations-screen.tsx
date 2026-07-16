// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import {
  ArrowRightOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
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
import {
  MigrationStatusTag,
  MigrationTypeTag,
} from "@/features/databases/database-tags";
import { MigrationEndpoints } from "@/features/databases/migrations/migration-endpoints";
import { MigrationFormModal } from "@/features/databases/migrations/migration-form-modal";
import { useVersionLookup } from "@/features/databases/migrations/use-version-lookup";

type DatabaseMigration = components["schemas"]["DatabaseMigrationItem"];

const LIST_KEY = [
  "get",
  "/v1/accounts/{account_id}/databases/{database_id}/migrations",
];

export function MigrationsScreen({
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
  const [form, setForm] = useState<DatabaseMigration | undefined | null>(null);

  const path = { account_id: accountId, database_id: databaseId };

  const migrationsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases/{database_id}/migrations",
    { params: { path } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/databases/{database_id}/migrations/{database_migration_id}",
    { meta: { successMessage: t`Migration supprimée` } }
  );

  const migrations = migrationsQuery.data?.items ?? [];
  const versions = useVersionLookup(accountId, [
    databaseId,
    ...migrations.flatMap((migration) => [
      migration.sourceDatabaseId,
      migration.destinationDatabaseId,
    ]),
  ]);

  function confirmDelete(migration: DatabaseMigration) {
    modal.confirm({
      title: t`Supprimer « ${migration.title} » ?`,
      content: t`Ses étapes de colonnes seront supprimées également. Cette action est irréversible.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: { ...path, database_migration_id: migration.id } },
        });
        queryClient.invalidateQueries({ queryKey: LIST_KEY });
      },
    });
  }

  const formModal =
    form === null ? null : (
      <MigrationFormModal
        accountId={accountId}
        databaseId={databaseId}
        key={form?.id ?? "create"}
        migration={form}
        onClose={() => setForm(null)}
        open
      />
    );

  const columns: TableProps<DatabaseMigration>["columns"] = [
    {
      title: t`Titre`,
      key: "title",
      width: COL.title,
      ellipsis: true,
      render: (_, migration) => (
        <Typography.Text>{migration.title}</Typography.Text>
      ),
    },
    {
      title: t`Versions`,
      key: "versions",
      width: COL.text,
      render: (_, migration) => (
        <MigrationEndpoints
          accountId={accountId}
          databaseId={databaseId}
          migration={migration}
          versions={versions}
        />
      ),
    },
    {
      title: t`Type`,
      key: "type",
      dataIndex: "type",
      width: COL.type,
      render: (type: DatabaseMigration["type"]) => (
        <MigrationTypeTag type={type} />
      ),
    },
    {
      title: t`Statut`,
      key: "status",
      dataIndex: "status",
      width: COL.status,
      render: (status: DatabaseMigration["status"]) => (
        <MigrationStatusTag status={status} />
      ),
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
      width: actionsWidth({ icons: 2, labelled: 1 }),
      render: (_, migration) => (
        <Space>
          <Link
            params={{ accountId, databaseId, migrationId: migration.id }}
            to="/accounts/$accountId/databases/$databaseId/migrations/$migrationId"
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
              onClick={() => setForm(migration)}
              size="small"
            />
          </Tooltip>
          <Tooltip title={t`Supprimer`}>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => confirmDelete(migration)}
              size="small"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (!migrationsQuery.isLoading && migrations.length === 0) {
    return (
      <Flex gap={16} vertical>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t`Migrations`}
        </Typography.Title>
        <Empty
          description={t`Cette base n'a aucune migration. Créez-en une pour planifier le passage d'une version à une autre.`}
        >
          <Button
            icon={<PlusOutlined />}
            onClick={() => setForm(undefined)}
            type="primary"
          >
            {t`Créer une migration`}
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
          {t`Migrations`}
        </Typography.Title>
        <Button
          icon={<PlusOutlined />}
          onClick={() => setForm(undefined)}
          type="primary"
        >
          {t`Créer une migration`}
        </Button>
      </Flex>

      <Table<DatabaseMigration>
        columns={columns}
        dataSource={migrations}
        loading={migrationsQuery.isLoading}
        pagination={false}
        rowKey="id"
        scroll={scrollX(columns)}
        size="small"
      />

      {formModal}
    </Flex>
  );
}
