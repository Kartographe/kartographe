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
import { ApplicationFormModal } from "@/features/applications/application-form-modal";
import {
  ApplicationStatusTag,
  ApplicationTypeTag,
} from "@/features/applications/application-tags";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_TYPE_LABELS,
} from "@/features/applications/labels";
import { TagsCell } from "@/features/tags/tags-cell";
import { useTagFilters } from "@/features/tags/use-tag-filters";

type Application = components["schemas"]["ApplicationItem"];
type Status = components["schemas"]["ApplicationStatus"];
type Type = components["schemas"]["ApplicationType"];
type SortField = components["schemas"]["ApplicationSortField"];
type SortOrder = components["schemas"]["SortOrder"];

const SORT_FIELD: Record<string, SortField> = {
  title: "title",
  date: "date",
  status: "status",
  type: "type",
};

export function ApplicationsList({ accountId }: { accountId: string }) {
  const { t } = useLingui();
  const { modal } = App.useApp();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Application | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<10 | 25 | 50 | 100>(25);
  const [sortBy, setSortBy] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);

  const tagFilters = useTagFilters(accountId, "application");

  const applicationsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/applications",
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

  const statusMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/applications/{application_id}",
    { meta: { successMessage: t`Statut mis à jour` } }
  );
  const typeMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/applications/{application_id}",
    { meta: { successMessage: t`Type mis à jour` } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/applications/{application_id}",
    { meta: { successMessage: t`Application supprimée` } }
  );

  const applications = applicationsQuery.data?.items ?? [];
  const total = applicationsQuery.data?.count ?? 0;
  const hasFilters =
    statuses.length > 0 || types.length > 0 || tagIds.length > 0;

  function invalidate() {
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/applications"],
    });
  }

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(application: Application) {
    setEditing(application);
    setFormOpen(true);
  }

  async function changeStatus(application: Application, status: Status) {
    await statusMutation.mutateAsync({
      params: {
        path: { account_id: accountId, application_id: application.id },
      },
      body: { status },
    });
    invalidate();
  }

  async function changeType(application: Application, type: Type) {
    await typeMutation.mutateAsync({
      params: {
        path: { account_id: accountId, application_id: application.id },
      },
      body: { type },
    });
    invalidate();
  }

  function confirmDelete(application: Application) {
    modal.confirm({
      title: t`Supprimer ${application.title} ?`,
      content: t`Cette action est irréversible.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: {
            path: { account_id: accountId, application_id: application.id },
          },
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

  const onChange: TableProps<Application>["onChange"] = (
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
    <ApplicationFormModal
      accountId={accountId}
      application={editing}
      key={editing?.id ?? "create"}
      onClose={() => setFormOpen(false)}
      open={formOpen}
    />
  );

  const columns: TableProps<Application>["columns"] = [
    {
      title: t`Titre`,
      key: "title",
      dataIndex: "title",
      sorter: true,
      sortOrder: antdOrder("title"),
      width: COL.title,
      render: (title: string, application) => (
        <Flex vertical>
          <Typography.Text ellipsis>{title}</Typography.Text>
          {application.description ? (
            <Typography.Text ellipsis style={{ fontSize: 12 }} type="secondary">
              {application.description}
            </Typography.Text>
          ) : null}
        </Flex>
      ),
    },
    {
      title: t`Type`,
      key: "type",
      dataIndex: "type",
      sorter: true,
      sortOrder: antdOrder("type"),
      width: COL.type,
      filters: dtoEnums.ApplicationType.map((value) => ({
        text: t(APPLICATION_TYPE_LABELS[value]),
        value,
      })),
      filteredValue: types.length ? types : null,
      render: (type: Type, application) => (
        <ApplicationTypeTag
          loading={typeMutation.isPending}
          onChange={(next) => changeType(application, next)}
          type={type}
        />
      ),
    },
    {
      title: t`Statut`,
      key: "status",
      dataIndex: "status",
      sorter: true,
      sortOrder: antdOrder("status"),
      width: COL.status,
      filters: dtoEnums.ApplicationStatus.map((value) => ({
        text: t(APPLICATION_STATUS_LABELS[value]),
        value,
      })),
      filteredValue: statuses.length ? statuses : null,
      render: (status: Status, application) => (
        <ApplicationStatusTag
          loading={statusMutation.isPending}
          onChange={(next) => changeStatus(application, next)}
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
      filteredValue: tagIds.length ? tagIds : null,
      render: (tags: Application["tags"]) => <TagsCell tags={tags} />,
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
      width: actionsWidth({ icons: 2, labelled: 1 }),
      render: (_, application) => (
        <Space>
          <Link
            params={{ accountId, applicationId: application.id }}
            to="/accounts/$accountId/applications/$applicationId"
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
              onClick={() => openEdit(application)}
              size="small"
            />
          </Tooltip>
          <Tooltip title={t`Supprimer`}>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => confirmDelete(application)}
              size="small"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (total === 0 && !hasFilters && !applicationsQuery.isLoading) {
    return (
      <Flex gap={16} vertical>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t`Applications`}
        </Typography.Title>
        <Empty description={t`Aucune application sur ce compte`}>
          <Button icon={<PlusOutlined />} onClick={openCreate} type="primary">
            {t`Créer une application`}
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
          {t`Applications`}
        </Typography.Title>
        <Button icon={<PlusOutlined />} onClick={openCreate} type="primary">
          {t`Créer une application`}
        </Button>
      </Flex>

      <Table<Application>
        columns={columns}
        dataSource={applications}
        loading={applicationsQuery.isLoading}
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
