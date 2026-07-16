// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import {
  CommentOutlined,
  DeleteOutlined,
  EditOutlined,
  InboxOutlined,
  PlusOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import { Plural, useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Collapse,
  Empty,
  Flex,
  Segmented,
  Spin,
  Tooltip,
  Typography,
} from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import {
  TableStatusTag,
  TableTypeTag,
  VersionStatusTag,
} from "@/features/databases/database-tags";
import { formatVersion } from "@/features/databases/labels";
import { ColorSwatch } from "@/features/databases/tables/color-swatch";
import { ColumnCommentsDrawer } from "@/features/databases/tables/column-comments-drawer";
import { ColumnFormModal } from "@/features/databases/tables/column-form-modal";
import { SchemaGraph } from "@/features/databases/tables/schema-graph";
import { TableColumns } from "@/features/databases/tables/table-columns";
import { TableCommentsDrawer } from "@/features/databases/tables/table-comments-drawer";
import { TableFormModal } from "@/features/databases/tables/table-form-modal";
import { useColumnTypes } from "@/features/databases/use-column-types";
import { RichTextView } from "@/lib/rich-text/rich-text-view";

type Database = components["schemas"]["DatabaseItem"];
type DatabaseVersion = components["schemas"]["DatabaseVersionItem"];
type DatabaseTable = components["schemas"]["DatabaseTableItem"];
type Column = components["schemas"]["DatabaseTableColumnItem"];

const TABLES_KEY = [
  "get",
  "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables",
];

/** A column being commented on, with the table it belongs to. */
interface ColumnTarget {
  table: DatabaseTable;
  column: Column;
}

/** A column being edited or created, with its table. */
interface ColumnEdit {
  table: DatabaseTable;
  column?: Column;
}

export function TablesScreen({
  accountId,
  database,
  version,
}: {
  accountId: string;
  database: Database;
  version: DatabaseVersion;
}) {
  const { t } = useLingui();
  const { modal } = App.useApp();
  const queryClient = useQueryClient();
  const columnTypes = useColumnTypes(database.type);

  const [view, setView] = useState<"list" | "graph">("list");
  const [tableForm, setTableForm] = useState<DatabaseTable | undefined | null>(
    null
  );
  const [columnForm, setColumnForm] = useState<ColumnEdit | null>(null);
  const [commentedTable, setCommentedTable] = useState<
    DatabaseTable | undefined
  >(undefined);
  const [commentedColumn, setCommentedColumn] = useState<
    ColumnTarget | undefined
  >(undefined);

  const selectedId = version.id;
  const path = {
    account_id: accountId,
    database_id: database.id,
    database_version_id: selectedId,
  };

  const tablesQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables",
    { params: { path } }
  );
  const activateMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/activate",
    { meta: { successMessage: t`Table activée` } }
  );
  const archiveMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/archive",
    { meta: { successMessage: t`Table archivée` } }
  );
  const deleteTableMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}",
    { meta: { successMessage: t`Table supprimée` } }
  );
  const deleteColumnMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/columns/{database_table_column_id}",
    { meta: { successMessage: t`Colonne supprimée` } }
  );

  const tables = [...(tablesQuery.data?.items ?? [])].sort(
    (a, b) => a.schema.localeCompare(b.schema) || a.name.localeCompare(b.name)
  );

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: TABLES_KEY });
  }

  async function toggleStatus(table: DatabaseTable) {
    const params = { path: { ...path, database_table_id: table.id } };
    if (table.status === "active") {
      await archiveMutation.mutateAsync({ params });
    } else {
      await activateMutation.mutateAsync({ params });
    }
    invalidate();
  }

  function confirmDeleteTable(table: DatabaseTable) {
    modal.confirm({
      title: t`Supprimer ${table.schema}.${table.name} ?`,
      content: t`Ses colonnes seront supprimées également. Cette action est irréversible.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteTableMutation.mutateAsync({
          params: { path: { ...path, database_table_id: table.id } },
        });
        invalidate();
      },
    });
  }

  function confirmDeleteColumn(table: DatabaseTable, column: Column) {
    modal.confirm({
      title: t`Supprimer la colonne ${column.name} ?`,
      content: t`Cette action est irréversible.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteColumnMutation.mutateAsync({
          params: {
            path: {
              ...path,
              database_table_id: table.id,
              database_table_column_id: column.id,
            },
          },
        });
        invalidate();
      },
    });
  }

  const items = tables.map((table) => ({
    key: table.id,
    style: {
      background: "var(--ant-color-fill-quaternary)",
      border: "1px solid var(--ant-color-border-secondary)",
      borderRadius: 4,
      marginBottom: 8,
      opacity: table.status === "archived" ? 0.6 : 1,
    },
    label: (
      <Flex align="center" gap={12} style={{ minWidth: 0 }}>
        <ColorSwatch color={table.color} />
        <Typography.Text
          code
        >{`${table.schema}.${table.name}`}</Typography.Text>
        <Typography.Text style={{ flex: 1 }} type="secondary">
          {(table.columns ?? []).length}
        </Typography.Text>
        <TableTypeTag type={table.type} />
        <TableStatusTag status={table.status} />
      </Flex>
    ),
    extra: (
      <Flex gap={4} onClick={(event) => event.stopPropagation()}>
        <Tooltip title={t`Commentaires`}>
          <Button
            icon={<CommentOutlined />}
            onClick={() => setCommentedTable(table)}
            size="small"
          />
        </Tooltip>
        <Tooltip title={t`Modifier`}>
          <Button
            icon={<EditOutlined />}
            onClick={() => setTableForm(table)}
            size="small"
          />
        </Tooltip>
        <Tooltip title={table.status === "active" ? t`Archiver` : t`Activer`}>
          <Button
            icon={
              table.status === "active" ? <InboxOutlined /> : <RocketOutlined />
            }
            onClick={() => toggleStatus(table)}
            size="small"
          />
        </Tooltip>
        <Tooltip title={t`Supprimer`}>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => confirmDeleteTable(table)}
            size="small"
          />
        </Tooltip>
      </Flex>
    ),
    children: (
      <Flex
        gap={12}
        style={{
          background: "var(--ant-color-bg-container)",
          borderRadius: 4,
          padding: 16,
        }}
        vertical
      >
        <RichTextView value={table.description} />

        <TableColumns
          accountId={accountId}
          columnTypes={columnTypes}
          databaseId={database.id}
          onComment={(column) => setCommentedColumn({ table, column })}
          onDelete={(column) => confirmDeleteColumn(table, column)}
          onEdit={(column) => setColumnForm({ table, column })}
          table={table}
          versionId={selectedId}
        />
      </Flex>
    ),
  }));

  return (
    // The diagram claims the panel's remaining height; the list keeps growing
    // with its content and lets the panel scroll.
    <Flex
      gap={16}
      style={view === "graph" ? { height: "100%", minHeight: 0 } : undefined}
      vertical
    >
      <Flex align="center" gap={12} justify="space-between" wrap>
        <Flex align="center" gap={12}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {t`Tables`}
          </Typography.Title>
          <Typography.Text code>
            {formatVersion(version.version)}
          </Typography.Text>
          {tablesQuery.isLoading ? null : (
            <Typography.Text type="secondary">
              <Plural one="# table" other="# tables" value={tables.length} />
            </Typography.Text>
          )}
          <VersionStatusTag status={version.status} />
        </Flex>
        <Flex align="center" gap={12}>
          <Segmented
            onChange={(value) => setView(value as "list" | "graph")}
            options={[
              { label: t`Liste`, value: "list" },
              { label: t`Diagramme`, value: "graph" },
            ]}
            value={view}
          />
          <Button
            icon={<PlusOutlined />}
            onClick={() => setTableForm(undefined)}
            type="primary"
          >
            {t`Créer une table`}
          </Button>
        </Flex>
      </Flex>

      {tablesQuery.isLoading ? (
        <Flex align="center" justify="center" style={{ minHeight: 160 }}>
          <Spin />
        </Flex>
      ) : null}

      {!tablesQuery.isLoading && tables.length === 0 ? (
        <Empty description={t`Aucune table`} />
      ) : null}

      {tables.length > 0 && view === "list" ? (
        <Collapse
          bordered={false}
          items={items}
          style={{ background: "transparent" }}
        />
      ) : null}

      {tables.length > 0 && view === "graph" ? (
        <SchemaGraph columnTypes={columnTypes} tables={tables} />
      ) : null}

      {tableForm === null ? null : (
        <TableFormModal
          accountId={accountId}
          databaseId={database.id}
          key={tableForm?.id ?? "create"}
          onClose={() => setTableForm(null)}
          open
          table={tableForm}
          versionId={selectedId}
        />
      )}

      {columnForm ? (
        <ColumnFormModal
          accountId={accountId}
          column={columnForm.column}
          columnTypes={columnTypes}
          databaseId={database.id}
          key={columnForm.column?.id ?? `create:${columnForm.table.id}`}
          onClose={() => setColumnForm(null)}
          open
          table={columnForm.table}
          tables={tables}
          versionId={selectedId}
        />
      ) : null}

      <TableCommentsDrawer
        accountId={accountId}
        databaseId={database.id}
        onClose={() => setCommentedTable(undefined)}
        table={commentedTable}
        versionId={selectedId}
      />

      {commentedColumn ? (
        <ColumnCommentsDrawer
          accountId={accountId}
          column={commentedColumn.column}
          databaseId={database.id}
          onClose={() => setCommentedColumn(undefined)}
          tableId={commentedColumn.table.id}
          tableName={`${commentedColumn.table.schema}.${commentedColumn.table.name}`}
          versionId={selectedId}
        />
      ) : null}
    </Flex>
  );
}
