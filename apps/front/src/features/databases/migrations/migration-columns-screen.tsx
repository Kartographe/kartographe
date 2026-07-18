// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import type { TableProps } from "antd";
import {
  App,
  Button,
  Dropdown,
  Empty,
  Flex,
  Space,
  Table,
  Tooltip,
  Typography,
} from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { actionsWidth, COL, scrollX } from "@/components/table/columns";
import { CommentCountButton } from "@/features/comments/comment-count-button";
import {
  MigrationColumnStatusTag,
  MigrationColumnTypeTag,
  MigrationStatusTag,
  MigrationTypeTag,
} from "@/features/databases/database-tags";
import {
  MIGRATION_COLUMN_STATUS_LABELS,
  MIGRATION_STATUS_LABELS,
} from "@/features/databases/labels";
import { MigrationColumnCommentsDrawer } from "@/features/databases/migrations/migration-column-comments-drawer";
import { MigrationColumnFormModal } from "@/features/databases/migrations/migration-column-form-modal";
import { MigrationCommentsDrawer } from "@/features/databases/migrations/migration-comments-drawer";
import { MigrationEndpoints } from "@/features/databases/migrations/migration-endpoints";
import { useVersionLookup } from "@/features/databases/migrations/use-version-lookup";
import { LockIndicator } from "@/features/lock/lock-indicator";
import { LockToggleButton } from "@/features/lock/lock-toggle-button";
import { useCanManageLock } from "@/features/lock/use-can-manage-lock";
import { votesColumn } from "@/features/votes/votes-column";
import { RichTextView } from "@/lib/rich-text/rich-text-view";

type S = components["schemas"];
type DatabaseMigration = S["DatabaseMigrationItem"];
type MigrationColumn = S["DatabaseMigrationColumnItem"];
type MigrationStatus = S["DatabaseMigrationStatus"];
type ColumnStatus = S["DatabaseMigrationColumnStatus"];
type DatabaseTable = S["DatabaseTableItem"];

interface MigrationPath {
  account_id: string;
  database_id: string;
  database_migration_id: string;
}
type ColumnPath = MigrationPath & { database_migration_column_id: string };

/**
 * The one call the status dispatch makes. The generated mutation types differ
 * per endpoint, so the records below are keyed on what they have in common.
 */
interface StatusMutation<P> {
  mutateAsync: (variables: { params: { path: P } }) => Promise<unknown>;
}

const COLUMNS_KEY = [
  "get",
  "/v1/accounts/{account_id}/databases/{database_id}/migrations/{database_migration_id}/columns",
];
const MIGRATIONS_KEY = [
  "get",
  "/v1/accounts/{account_id}/databases/{database_id}/migrations",
];

const MIGRATION_STATUSES: MigrationStatus[] = [
  "draft",
  "validated",
  "completed",
  "cancelled",
];
const COLUMN_STATUSES: ColumnStatus[] = [
  "draft",
  "to_be_confirmed",
  "confirmed",
];

const EMPTY = "—";

/** `public.users.email`, or `—` when this side is not part of the step. */
function endpointLabel(
  tables: DatabaseTable[],
  tableId: string | null | undefined,
  columnId: string | null | undefined
): string {
  if (!tableId) {
    return EMPTY;
  }
  const table = tables.find((candidate) => candidate.id === tableId);
  if (!table) {
    return EMPTY;
  }
  const qualified = `${table.schema}.${table.name}`;
  const column = (table.columns ?? []).find(
    (candidate) => candidate.id === columnId
  );
  return column ? `${qualified}.${column.name}` : qualified;
}

export function MigrationColumnsScreen({
  accountId,
  databaseId,
  migration,
}: {
  accountId: string;
  databaseId: string;
  migration: DatabaseMigration;
}) {
  const { t } = useLingui();
  const { modal } = App.useApp();
  const queryClient = useQueryClient();
  // `null` = closed, `undefined` = open in create mode.
  const [form, setForm] = useState<MigrationColumn | undefined | null>(null);
  const [migrationCommentsOpen, setMigrationCommentsOpen] = useState(false);
  const [commentedColumn, setCommentedColumn] = useState<
    MigrationColumn | undefined
  >(undefined);
  const [myVote, setMyVote] = useState<string | null>(null);

  const path = {
    account_id: accountId,
    database_id: databaseId,
    database_migration_id: migration.id,
  };

  const columnsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases/{database_id}/migrations/{database_migration_id}/columns",
    { params: { path, query: { ...(myVote ? { myVote } : {}) } } }
  );
  const sourceTablesQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables",
    {
      params: {
        path: {
          account_id: accountId,
          database_id: migration.sourceDatabaseId,
          database_version_id: migration.sourceDatabaseVersionId,
        },
      },
    }
  );
  const destinationTablesQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables",
    {
      params: {
        path: {
          account_id: accountId,
          database_id: migration.destinationDatabaseId,
          database_version_id: migration.destinationDatabaseVersionId,
        },
      },
    }
  );

  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/databases/{database_id}/migrations/{database_migration_id}/columns/{database_migration_column_id}",
    { meta: { successMessage: t`Étape supprimée` } }
  );
  const migrationLockMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/databases/{database_id}/migrations/{database_migration_id}/lock",
    { meta: { successMessage: t`Migration verrouillée` } }
  );
  const migrationUnlockMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/databases/{database_id}/migrations/{database_migration_id}/unlock",
    { meta: { successMessage: t`Migration déverrouillée` } }
  );
  const columnLockMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/databases/{database_id}/migrations/{database_migration_id}/columns/{database_migration_column_id}/lock",
    { meta: { successMessage: t`Étape verrouillée` } }
  );
  const columnUnlockMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/databases/{database_id}/migrations/{database_migration_id}/columns/{database_migration_column_id}/unlock",
    { meta: { successMessage: t`Étape déverrouillée` } }
  );

  const canManageLock = useCanManageLock(accountId);
  const migrationLockPending =
    migrationLockMutation.isPending || migrationUnlockMutation.isPending;
  const columnLockPending =
    columnLockMutation.isPending || columnUnlockMutation.isPending;

  async function toggleMigrationLock() {
    const mutation = migration.locked
      ? migrationUnlockMutation
      : migrationLockMutation;
    await mutation.mutateAsync({ params: { path } });
    queryClient.invalidateQueries({ queryKey: MIGRATIONS_KEY });
  }

  async function toggleColumnLock(column: MigrationColumn) {
    const mutation = column.locked ? columnUnlockMutation : columnLockMutation;
    await mutation.mutateAsync({
      params: { path: { ...path, database_migration_column_id: column.id } },
    });
    queryClient.invalidateQueries({ queryKey: COLUMNS_KEY });
  }

  // Each status is its own endpoint, so each needs its own hook — no path can be
  // built from the target status without losing the generated types.
  const migrationStatusMeta = {
    meta: { successMessage: t`Statut de la migration mis à jour` },
  };
  const migrationStatusMutations: Record<
    MigrationStatus,
    StatusMutation<MigrationPath>
  > = {
    draft: $api.useMutation(
      "post",
      "/v1/accounts/{account_id}/databases/{database_id}/migrations/{database_migration_id}/draft",
      migrationStatusMeta
    ),
    validated: $api.useMutation(
      "post",
      "/v1/accounts/{account_id}/databases/{database_id}/migrations/{database_migration_id}/validated",
      migrationStatusMeta
    ),
    completed: $api.useMutation(
      "post",
      "/v1/accounts/{account_id}/databases/{database_id}/migrations/{database_migration_id}/completed",
      migrationStatusMeta
    ),
    cancelled: $api.useMutation(
      "post",
      "/v1/accounts/{account_id}/databases/{database_id}/migrations/{database_migration_id}/cancelled",
      migrationStatusMeta
    ),
  };

  const columnStatusMeta = {
    meta: { successMessage: t`Statut de l'étape mis à jour` },
  };
  const columnStatusMutations: Record<
    ColumnStatus,
    StatusMutation<ColumnPath>
  > = {
    draft: $api.useMutation(
      "post",
      "/v1/accounts/{account_id}/databases/{database_id}/migrations/{database_migration_id}/columns/{database_migration_column_id}/draft",
      columnStatusMeta
    ),
    to_be_confirmed: $api.useMutation(
      "post",
      "/v1/accounts/{account_id}/databases/{database_id}/migrations/{database_migration_id}/columns/{database_migration_column_id}/to_be_confirmed",
      columnStatusMeta
    ),
    confirmed: $api.useMutation(
      "post",
      "/v1/accounts/{account_id}/databases/{database_id}/migrations/{database_migration_id}/columns/{database_migration_column_id}/confirmed",
      columnStatusMeta
    ),
  };

  const columns = columnsQuery.data?.items ?? [];
  const sourceTables = sourceTablesQuery.data?.items ?? [];
  const destinationTables = destinationTablesQuery.data?.items ?? [];
  const versions = useVersionLookup(accountId, [
    migration.sourceDatabaseId,
    migration.destinationDatabaseId,
  ]);

  /** The step, read as its endpoints — only the sides its type carries. */
  function stepLabel(column: MigrationColumn): string {
    const source = endpointLabel(
      sourceTables,
      column.sourceDatabaseTableId,
      column.sourceDatabaseTableColumnId
    );
    const destination = endpointLabel(
      destinationTables,
      column.destinationDatabaseTableId,
      column.destinationDatabaseTableColumnId
    );
    if (column.type === "deletion") {
      return source;
    }
    if (column.type === "creation") {
      return destination;
    }
    return `${source} → ${destination}`;
  }

  async function setMigrationStatus(status: MigrationStatus) {
    await migrationStatusMutations[status].mutateAsync({ params: { path } });
    queryClient.invalidateQueries({ queryKey: MIGRATIONS_KEY });
  }

  async function setColumnStatus(
    column: MigrationColumn,
    status: ColumnStatus
  ) {
    await columnStatusMutations[status].mutateAsync({
      params: { path: { ...path, database_migration_column_id: column.id } },
    });
    queryClient.invalidateQueries({ queryKey: COLUMNS_KEY });
  }

  function confirmDelete(column: MigrationColumn) {
    modal.confirm({
      title: t`Supprimer cette étape ?`,
      content: t`Cette action est irréversible.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: {
            path: { ...path, database_migration_column_id: column.id },
          },
        });
        queryClient.invalidateQueries({ queryKey: COLUMNS_KEY });
      },
    });
  }

  const onChange: TableProps<MigrationColumn>["onChange"] = (
    _pagination,
    filters
  ) => {
    setMyVote((filters.votes as string[] | null)?.[0] ?? null);
  };

  const formModal =
    form === null ? null : (
      <MigrationColumnFormModal
        accountId={accountId}
        column={form}
        databaseId={databaseId}
        key={form?.id ?? "create"}
        migration={migration}
        onClose={() => setForm(null)}
        open
      />
    );

  const addButton = (
    <Button
      icon={<PlusOutlined />}
      onClick={() => setForm(undefined)}
      type="primary"
    >
      {t`Ajouter une étape`}
    </Button>
  );

  const header = (
    <Flex gap={12} vertical>
      <Flex align="center" justify="space-between">
        <Flex align="center" gap={8}>
          <LockIndicator
            locked={migration.locked}
            lockedBy={migration.lockedBy}
            lockedDate={migration.lockedDate}
          />
          <Typography.Title level={4} style={{ margin: 0 }}>
            {migration.title}
          </Typography.Title>
        </Flex>
        <Space>
          {canManageLock ? (
            <LockToggleButton
              locked={migration.locked}
              onToggle={toggleMigrationLock}
              pending={migrationLockPending}
              size="middle"
            />
          ) : null}
          <CommentCountButton
            count={migration.commentCount}
            onClick={() => setMigrationCommentsOpen(true)}
          />
          <Dropdown
            disabled={migration.locked}
            menu={{
              items: MIGRATION_STATUSES.map((status) => ({
                key: status,
                label: t(MIGRATION_STATUS_LABELS[status]),
                disabled: status === migration.status,
                onClick: () => setMigrationStatus(status),
              })),
            }}
          >
            <Button icon={<SwapOutlined />}>{t`Statut`}</Button>
          </Dropdown>
          {addButton}
        </Space>
      </Flex>
      <Flex align="center" gap={12} wrap>
        <MigrationEndpoints
          accountId={accountId}
          databaseId={databaseId}
          migration={migration}
          versions={versions}
        />
        <MigrationTypeTag type={migration.type} />
        <MigrationStatusTag status={migration.status} />
      </Flex>
      {migration.description ? (
        <RichTextView value={migration.description} />
      ) : null}
    </Flex>
  );

  const tableColumns: TableProps<MigrationColumn>["columns"] = [
    {
      title: t`Type`,
      key: "type",
      dataIndex: "type",
      width: COL.type,
      render: (type: MigrationColumn["type"], column) => (
        <Flex align="center" gap={6}>
          <LockIndicator
            locked={column.locked}
            lockedBy={column.lockedBy}
            lockedDate={column.lockedDate}
          />
          <MigrationColumnTypeTag type={type} />
        </Flex>
      ),
    },
    {
      title: t`Source`,
      key: "source",
      width: COL.text,
      ellipsis: true,
      render: (_, column) => (
        <Typography.Text code={column.sourceDatabaseTableId !== null}>
          {endpointLabel(
            sourceTables,
            column.sourceDatabaseTableId,
            column.sourceDatabaseTableColumnId
          )}
        </Typography.Text>
      ),
    },
    {
      title: t`Destination`,
      key: "destination",
      width: COL.text,
      ellipsis: true,
      render: (_, column) => (
        <Typography.Text code={column.destinationDatabaseTableId !== null}>
          {endpointLabel(
            destinationTables,
            column.destinationDatabaseTableId,
            column.destinationDatabaseTableColumnId
          )}
        </Typography.Text>
      ),
    },
    {
      title: t`Transformation`,
      key: "transformationMethod",
      dataIndex: "transformationMethod",
      width: COL.text,
      ellipsis: true,
      render: (value: string | null) =>
        value ? <Typography.Text code>{value}</Typography.Text> : EMPTY,
    },
    {
      title: t`Statut`,
      key: "status",
      dataIndex: "status",
      width: COL.status,
      render: (status: MigrationColumn["status"]) => (
        <MigrationColumnStatusTag status={status} />
      ),
    },
    votesColumn({ t, notVotedLabel: t`Pas encore voté`, myVote }),
    {
      title: "",
      key: "actions",
      align: "right",
      fixed: "right",
      width: actionsWidth({ icons: canManageLock ? 5 : 4 }),
      render: (_, column) => (
        <Space>
          {canManageLock ? (
            <LockToggleButton
              locked={column.locked}
              onToggle={() => toggleColumnLock(column)}
              pending={columnLockPending}
            />
          ) : null}
          <CommentCountButton
            count={column.commentCount}
            onClick={() => setCommentedColumn(column)}
          />
          <Dropdown
            disabled={column.locked}
            menu={{
              items: COLUMN_STATUSES.map((status) => ({
                key: status,
                label: t(MIGRATION_COLUMN_STATUS_LABELS[status]),
                disabled: status === column.status,
                onClick: () => setColumnStatus(column, status),
              })),
            }}
          >
            <Button icon={<SwapOutlined />} size="small" />
          </Dropdown>
          <Tooltip title={column.locked ? t`Étape verrouillée` : t`Modifier`}>
            <Button
              disabled={column.locked}
              icon={<EditOutlined />}
              onClick={() => setForm(column)}
              size="small"
            />
          </Tooltip>
          <Tooltip title={column.locked ? t`Étape verrouillée` : t`Supprimer`}>
            <Button
              danger
              disabled={column.locked}
              icon={<DeleteOutlined />}
              onClick={() => confirmDelete(column)}
              size="small"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Flex gap={16} vertical>
      {header}

      {!columnsQuery.isLoading && columns.length === 0 ? (
        <Empty
          description={t`Cette migration n'a aucune étape. Ajoutez-en une pour décrire ce qui arrive à chaque colonne.`}
        >
          {addButton}
        </Empty>
      ) : (
        <Table<MigrationColumn>
          columns={tableColumns}
          dataSource={columns}
          loading={columnsQuery.isLoading}
          onChange={onChange}
          pagination={false}
          rowKey="id"
          scroll={scrollX(tableColumns)}
          size="small"
        />
      )}

      {formModal}
      <MigrationCommentsDrawer
        accountId={accountId}
        databaseId={databaseId}
        migration={migrationCommentsOpen ? migration : undefined}
        onClose={() => setMigrationCommentsOpen(false)}
      />
      <MigrationColumnCommentsDrawer
        accountId={accountId}
        column={commentedColumn}
        databaseId={databaseId}
        label={commentedColumn ? stepLabel(commentedColumn) : ""}
        migrationId={migration.id}
        onClose={() => setCommentedColumn(undefined)}
      />
    </Flex>
  );
}
