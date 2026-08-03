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
import { dtoEnums } from "@/api/generated/schema.enums";
import { actionsWidth, COL, scrollX } from "@/components/table/columns";
import { CommentCountButton } from "@/features/comments/comment-count-button";
import { DatabaseFormModal } from "@/features/databases/database-form-modal";
import {
  DatabaseStatusTag,
  DatabaseTypeTag,
} from "@/features/databases/database-tags";
import {
  DATABASE_STATUS_LABELS,
  DATABASE_TYPE_LABELS,
} from "@/features/databases/labels";
import { LockIndicator } from "@/features/lock/lock-indicator";
import { LockToggleButton } from "@/features/lock/lock-toggle-button";
import { useCanManageLock } from "@/features/lock/use-can-manage-lock";
import { PAGE_SIZES, useListView } from "@/features/preferences/use-list-view";
import { EditableTagsCell } from "@/features/tags/editable-tags-cell";
import { useTagFilters } from "@/features/tags/use-tag-filters";
import { votesColumn } from "@/features/votes/votes-column";

type Database = components["schemas"]["DatabaseItem"];
type Status = components["schemas"]["DatabaseStatus"];
type Type = components["schemas"]["DatabaseType"];
type SortField = components["schemas"]["DatabaseSortField"];

const SORT_FIELD: Record<string, SortField> = {
  title: "title",
  date: "date",
  status: "status",
  type: "type",
};

export function DatabasesList({ accountId }: { accountId: string }) {
  const { t } = useLingui();
  const { modal } = App.useApp();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Database | undefined>(undefined);
  const view = useListView<Database, SortField>(
    accountId,
    "databases",
    { filters: {}, limit: 25, page: 1, sortBy: "date", sortOrder: "desc" },
    SORT_FIELD
  );
  const statuses = (view.filterValue("status") ?? []) as Status[];
  const types = (view.filterValue("type") ?? []) as Type[];
  const tagIds = view.filterValue("tags") ?? [];
  const myVote = view.firstFilterValue("votes");

  const tagFilters = useTagFilters(accountId, "database");

  const databasesQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases",
    {
      params: {
        path: { account_id: accountId },
        query: {
          page: view.page,
          limit: view.limit,
          sortBy: view.sortBy,
          sortOrder: view.sortOrder,
          ...(statuses.length ? { status: statuses } : {}),
          ...(types.length ? { type: types } : {}),
          ...(tagIds.length ? { tagIds } : {}),
          ...(myVote ? { myVote } : {}),
        },
      },
    },
    { enabled: view.ready }
  );

  const statusMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/databases/{database_id}",
    { meta: { successMessage: t`Statut mis à jour` } }
  );
  const typeMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/databases/{database_id}",
    { meta: { successMessage: t`Type mis à jour` } }
  );
  const tagsMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/databases/{database_id}",
    { meta: { successMessage: t`Tags mis à jour` } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/databases/{database_id}",
    { meta: { successMessage: t`Base de données supprimée` } }
  );
  const lockMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/databases/{database_id}/lock",
    { meta: { successMessage: t`Base de données verrouillée` } }
  );
  const unlockMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/databases/{database_id}/unlock",
    { meta: { successMessage: t`Base de données déverrouillée` } }
  );

  const canManageLock = useCanManageLock(accountId);
  const lockPending = lockMutation.isPending || unlockMutation.isPending;

  const databases = databasesQuery.data?.items ?? [];
  const total = databasesQuery.data?.count ?? 0;
  const loading = !view.ready || databasesQuery.isLoading;

  function invalidate() {
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/databases"],
    });
  }

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(database: Database) {
    setEditing(database);
    setFormOpen(true);
  }

  async function changeStatus(database: Database, status: Status) {
    await statusMutation.mutateAsync({
      params: { path: { account_id: accountId, database_id: database.id } },
      body: { status },
    });
    invalidate();
  }

  async function changeType(database: Database, type: Type) {
    await typeMutation.mutateAsync({
      params: { path: { account_id: accountId, database_id: database.id } },
      body: { type },
    });
    invalidate();
  }

  async function changeTags(database: Database, tagIds: string[]) {
    await tagsMutation.mutateAsync({
      params: { path: { account_id: accountId, database_id: database.id } },
      body: { tagIds },
    });
    invalidate();
  }

  async function toggleLock(database: Database) {
    const mutation = database.locked ? unlockMutation : lockMutation;
    await mutation.mutateAsync({
      params: { path: { account_id: accountId, database_id: database.id } },
    });
    invalidate();
  }

  function confirmDelete(database: Database) {
    modal.confirm({
      title: t`Supprimer ${database.title} ?`,
      content: t`Ses versions, tables et colonnes seront supprimées également. Cette action est irréversible.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: { account_id: accountId, database_id: database.id } },
        });
        invalidate();
      },
    });
  }

  const formModal = (
    <DatabaseFormModal
      accountId={accountId}
      database={editing}
      key={editing?.id ?? "create"}
      onClose={() => setFormOpen(false)}
      open={formOpen}
    />
  );

  const columns: TableProps<Database>["columns"] = [
    {
      title: t`Titre`,
      key: "title",
      dataIndex: "title",
      sorter: true,
      sortOrder: view.sortOrderFor("title"),
      width: COL.title,
      ellipsis: true,
      render: (title: string, database) => (
        <Flex align="center" gap={6}>
          <LockIndicator
            locked={database.locked}
            lockedBy={database.lockedBy}
            lockedDate={database.lockedDate}
          />
          <Typography.Text ellipsis>{title}</Typography.Text>
        </Flex>
      ),
    },
    {
      title: t`Moteur`,
      key: "type",
      dataIndex: "type",
      sorter: true,
      sortOrder: view.sortOrderFor("type"),
      width: COL.type,
      filters: dtoEnums.DatabaseType.map((value) => ({
        text: t(DATABASE_TYPE_LABELS[value]),
        value,
      })),
      filteredValue: view.filterValue("type"),
      render: (type: Type, database) => (
        <DatabaseTypeTag
          loading={typeMutation.isPending}
          onChange={
            database.locked ? undefined : (next) => changeType(database, next)
          }
          type={type}
        />
      ),
    },
    {
      title: t`Statut`,
      key: "status",
      dataIndex: "status",
      sorter: true,
      sortOrder: view.sortOrderFor("status"),
      width: COL.status,
      filters: dtoEnums.DatabaseStatus.map((value) => ({
        text: t(DATABASE_STATUS_LABELS[value]),
        value,
      })),
      filteredValue: view.filterValue("status"),
      render: (status: Status, database) => (
        <DatabaseStatusTag
          loading={statusMutation.isPending}
          onChange={
            database.locked ? undefined : (next) => changeStatus(database, next)
          }
          status={status}
        />
      ),
    },
    {
      title: t`Tags`,
      key: "tags",
      dataIndex: "tags",
      width: COL.tags,
      filters: tagFilters,
      filteredValue: view.filterValue("tags"),
      render: (tags: Database["tags"], database) => (
        <EditableTagsCell
          accountId={accountId}
          entityType="database"
          loading={tagsMutation.isPending}
          onChange={(next) => changeTags(database, next)}
          readOnly={database.locked}
          tags={tags}
          value={database.tagIds}
        />
      ),
    },
    {
      title: t`Créée le`,
      hidden: true,
      key: "date",
      dataIndex: "date",
      sorter: true,
      sortOrder: view.sortOrderFor("date"),
      width: COL.date,
      render: (value: string | null) =>
        value ? dayjs(value).format("DD/MM/YYYY") : "—",
    },
    votesColumn({ t, notVotedLabel: t`Pas encore voté`, myVote }),
    {
      title: "",
      key: "actions",
      align: "right",
      fixed: "right",
      width: actionsWidth({ icons: canManageLock ? 4 : 3, labelled: 1 }),
      render: (_, database) => (
        <Space>
          {canManageLock ? (
            <LockToggleButton
              locked={database.locked}
              onToggle={() => toggleLock(database)}
              pending={lockPending}
            />
          ) : null}
          <Link
            params={{ accountId, databaseId: database.id }}
            to="/accounts/$accountId/databases/$databaseId/comments"
          >
            <CommentCountButton count={database.commentCount} />
          </Link>
          <Link
            params={{ accountId, databaseId: database.id }}
            to="/accounts/$accountId/databases/$databaseId"
          >
            <Button
              icon={<ArrowRightOutlined />}
              iconPosition="end"
              size="small"
            >
              {t`Accéder`}
            </Button>
          </Link>
          <Tooltip
            title={
              database.locked ? t`Base de données verrouillée` : t`Modifier`
            }
          >
            <Button
              disabled={database.locked}
              icon={<EditOutlined />}
              onClick={() => openEdit(database)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={
              database.locked ? t`Base de données verrouillée` : t`Supprimer`
            }
          >
            <Button
              danger
              disabled={database.locked}
              icon={<DeleteOutlined />}
              onClick={() => confirmDelete(database)}
              size="small"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (total === 0 && !(view.hasFilters || loading)) {
    return (
      <Flex gap={16} vertical>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t`Bases de données`}
        </Typography.Title>
        <Empty description={t`Aucune base de données sur ce compte`}>
          <Button icon={<PlusOutlined />} onClick={openCreate} type="primary">
            {t`Créer une base de données`}
          </Button>
        </Empty>
        {formModal}
      </Flex>
    );
  }

  return (
    <Flex gap={16} vertical>
      <Flex align="center" justify="space-between">
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t`Bases de données`}
        </Typography.Title>
        <Button icon={<PlusOutlined />} onClick={openCreate} type="primary">
          {t`Créer une base de données`}
        </Button>
      </Flex>

      <Table<Database>
        columns={columns}
        dataSource={databases}
        loading={loading}
        onChange={view.onTableChange}
        pagination={{
          current: view.page,
          pageSize: view.limit,
          total,
          showSizeChanger: true,
          pageSizeOptions: PAGE_SIZES,
        }}
        rowKey="id"
        scroll={scrollX(columns)}
        size="small"
      />

      {formModal}
    </Flex>
  );
}
