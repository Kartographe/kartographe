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
import { dtoEnums } from "@/api/generated/schema.enums";
import { actionsWidth, COL, scrollX } from "@/components/table/columns";
import { DatabaseFormModal } from "@/features/databases/database-form-modal";
import {
  DatabaseStatusTag,
  DatabaseTypeTag,
} from "@/features/databases/database-tags";
import {
  DATABASE_STATUS_LABELS,
  DATABASE_TYPE_LABELS,
} from "@/features/databases/labels";
import { TagsCell } from "@/features/tags/tags-cell";
import { useTagFilters } from "@/features/tags/use-tag-filters";

type Database = components["schemas"]["DatabaseItem"];
type Status = components["schemas"]["DatabaseStatus"];
type Type = components["schemas"]["DatabaseType"];
type SortField = components["schemas"]["DatabaseSortField"];
type SortOrder = components["schemas"]["SortOrder"];

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
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<10 | 25 | 50 | 100>(25);
  const [sortBy, setSortBy] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);

  const tagFilters = useTagFilters(accountId, "database");

  const databasesQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases",
    {
      params: {
        path: { account_id: accountId },
        query: {
          page,
          limit,
          sortBy,
          sortOrder,
          ...(statuses.length ? { status: statuses } : {}),
          ...(types.length ? { type: types } : {}),
          ...(tagIds.length ? { tagIds } : {}),
        },
      },
    }
  );

  const activateMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/databases/{database_id}/activate",
    { meta: { successMessage: t`Base de données activée` } }
  );
  const archiveMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/databases/{database_id}/archive",
    { meta: { successMessage: t`Base de données archivée` } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/databases/{database_id}",
    { meta: { successMessage: t`Base de données supprimée` } }
  );

  const databases = databasesQuery.data?.items ?? [];
  const total = databasesQuery.data?.count ?? 0;
  const hasFilters =
    statuses.length > 0 || types.length > 0 || tagIds.length > 0;

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

  async function toggleStatus(database: Database) {
    const params = {
      path: { account_id: accountId, database_id: database.id },
    };
    if (database.status === "active") {
      await archiveMutation.mutateAsync({ params });
    } else {
      await activateMutation.mutateAsync({ params });
    }
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

  const antdOrder = (field: SortField): "ascend" | "descend" | null => {
    if (sortBy !== field) {
      return null;
    }
    return sortOrder === "asc" ? "ascend" : "descend";
  };

  const onChange: TableProps<Database>["onChange"] = (
    pagination,
    filters,
    sorter
  ) => {
    setPage(pagination.current ?? 1);
    setLimit((pagination.pageSize as 10 | 25 | 50 | 100) ?? 25);
    setStatuses((filters.status as Status[] | null) ?? []);
    setTypes((filters.type as Type[] | null) ?? []);
    setTagIds((filters.tags as string[] | null) ?? []);
    const single = Array.isArray(sorter) ? sorter[0] : sorter;
    if (single?.order && single.columnKey) {
      setSortBy(SORT_FIELD[String(single.columnKey)] ?? "date");
      setSortOrder(single.order === "ascend" ? "asc" : "desc");
    }
  };

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
      sortOrder: antdOrder("title"),
      width: COL.title,
      ellipsis: true,
    },
    {
      title: t`Moteur`,
      key: "type",
      dataIndex: "type",
      sorter: true,
      sortOrder: antdOrder("type"),
      width: COL.type,
      filters: dtoEnums.DatabaseType.map((value) => ({
        text: t(DATABASE_TYPE_LABELS[value]),
        value,
      })),
      filteredValue: types.length ? types : null,
      render: (type: Type) => <DatabaseTypeTag type={type} />,
    },
    {
      title: t`Statut`,
      key: "status",
      dataIndex: "status",
      sorter: true,
      sortOrder: antdOrder("status"),
      width: COL.status,
      filters: dtoEnums.DatabaseStatus.map((value) => ({
        text: t(DATABASE_STATUS_LABELS[value]),
        value,
      })),
      filteredValue: statuses.length ? statuses : null,
      render: (status: Status) => <DatabaseStatusTag status={status} />,
    },
    {
      title: t`Tags`,
      key: "tags",
      dataIndex: "tags",
      width: COL.tags,
      filters: tagFilters,
      filteredValue: tagIds.length ? tagIds : null,
      render: (tags: Database["tags"]) => <TagsCell tags={tags} />,
    },
    {
      title: t`Créée le`,
      hidden: true,
      key: "date",
      dataIndex: "date",
      sorter: true,
      sortOrder: antdOrder("date"),
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
      render: (_, database) => (
        <Space>
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
          <Tooltip title={t`Modifier`}>
            <Button
              icon={<EditOutlined />}
              onClick={() => openEdit(database)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={database.status === "active" ? t`Archiver` : t`Activer`}
          >
            <Button
              icon={
                database.status === "active" ? (
                  <InboxOutlined />
                ) : (
                  <RocketOutlined />
                )
              }
              onClick={() => toggleStatus(database)}
              size="small"
            />
          </Tooltip>
          <Tooltip title={t`Supprimer`}>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => confirmDelete(database)}
              size="small"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (total === 0 && !hasFilters && !databasesQuery.isLoading) {
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
        loading={databasesQuery.isLoading}
        onChange={onChange}
        pagination={{
          current: page,
          pageSize: limit,
          total,
          showSizeChanger: true,
          pageSizeOptions: [10, 25, 50, 100],
        }}
        rowKey="id"
        scroll={scrollX(columns)}
        size="small"
      />

      {formModal}
    </Flex>
  );
}
