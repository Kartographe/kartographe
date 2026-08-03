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
import { CommentCountButton } from "@/features/comments/comment-count-button";
import { complexityColumn } from "@/features/complexity/complexity-column";
import { LockIndicator } from "@/features/lock/lock-indicator";
import { LockToggleButton } from "@/features/lock/lock-toggle-button";
import { useCanManageLock } from "@/features/lock/use-can-manage-lock";
import { PAGE_SIZES, useListView } from "@/features/preferences/use-list-view";
import { EditableTagsCell } from "@/features/tags/editable-tags-cell";
import { useTagFilters } from "@/features/tags/use-tag-filters";
import { votesColumn } from "@/features/votes/votes-column";

type Application = components["schemas"]["ApplicationItem"];
type Status = components["schemas"]["ApplicationStatus"];
type Type = components["schemas"]["ApplicationType"];
type SortField = components["schemas"]["ApplicationSortField"];

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
  const view = useListView<Application, SortField>(
    accountId,
    "applications",
    { filters: {}, limit: 25, page: 1, sortBy: "date", sortOrder: "desc" },
    SORT_FIELD
  );
  const statuses = (view.filterValue("status") ?? []) as Status[];
  const types = (view.filterValue("type") ?? []) as Type[];
  const tagIds = view.filterValue("tags") ?? [];
  const myVote = view.firstFilterValue("votes");
  const myComplexity = view.firstFilterValue("complexity");

  const tagFilters = useTagFilters(accountId, "application");

  const applicationsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/applications",
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
          ...(myComplexity ? { myComplexity } : {}),
        },
      },
    },
    { enabled: view.ready }
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
  const tagsMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/applications/{application_id}",
    { meta: { successMessage: t`Tags mis à jour` } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/applications/{application_id}",
    { meta: { successMessage: t`Application supprimée` } }
  );
  const lockMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/applications/{application_id}/lock",
    { meta: { successMessage: t`Application verrouillée` } }
  );
  const unlockMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/applications/{application_id}/unlock",
    { meta: { successMessage: t`Application déverrouillée` } }
  );

  const canManageLock = useCanManageLock(accountId);
  const lockPending = lockMutation.isPending || unlockMutation.isPending;

  const applications = applicationsQuery.data?.items ?? [];
  const total = applicationsQuery.data?.count ?? 0;
  const loading = !view.ready || applicationsQuery.isLoading;

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

  async function changeTags(application: Application, tagIds: string[]) {
    await tagsMutation.mutateAsync({
      params: {
        path: { account_id: accountId, application_id: application.id },
      },
      body: { tagIds },
    });
    invalidate();
  }

  async function toggleLock(application: Application) {
    const mutation = application.locked ? unlockMutation : lockMutation;
    await mutation.mutateAsync({
      params: {
        path: { account_id: accountId, application_id: application.id },
      },
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
      sortOrder: view.sortOrderFor("title"),
      width: COL.title,
      render: (title: string, application) => (
        <Flex vertical>
          <Flex align="center" gap={6}>
            <LockIndicator
              locked={application.locked}
              lockedBy={application.lockedBy}
              lockedDate={application.lockedDate}
            />
            <Typography.Text ellipsis>{title}</Typography.Text>
          </Flex>
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
      sortOrder: view.sortOrderFor("type"),
      width: COL.type,
      filters: dtoEnums.ApplicationType.map((value) => ({
        text: t(APPLICATION_TYPE_LABELS[value]),
        value,
      })),
      filteredValue: view.filterValue("type"),
      render: (type: Type, application) => (
        <ApplicationTypeTag
          loading={typeMutation.isPending}
          onChange={
            application.locked
              ? undefined
              : (next) => changeType(application, next)
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
      filters: dtoEnums.ApplicationStatus.map((value) => ({
        text: t(APPLICATION_STATUS_LABELS[value]),
        value,
      })),
      filteredValue: view.filterValue("status"),
      render: (status: Status, application) => (
        <ApplicationStatusTag
          loading={statusMutation.isPending}
          onChange={
            application.locked
              ? undefined
              : (next) => changeStatus(application, next)
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
      render: (tags: Application["tags"], application) => (
        <EditableTagsCell
          accountId={accountId}
          entityType="application"
          loading={tagsMutation.isPending}
          onChange={(next) => changeTags(application, next)}
          readOnly={application.locked}
          tags={tags}
          value={application.tagIds}
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
    complexityColumn({ t, myComplexity }),
    {
      title: "",
      key: "actions",
      align: "right",
      fixed: "right",
      width: actionsWidth({ icons: canManageLock ? 4 : 3, labelled: 1 }),
      render: (_, application) => (
        <Space>
          {canManageLock ? (
            <LockToggleButton
              locked={application.locked}
              onToggle={() => toggleLock(application)}
              pending={lockPending}
            />
          ) : null}
          <Link
            params={{ accountId, applicationId: application.id }}
            to="/accounts/$accountId/applications/$applicationId/comments"
          >
            <CommentCountButton count={application.commentCount} />
          </Link>
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
          <Tooltip
            title={
              application.locked ? t`Application verrouillée` : t`Modifier`
            }
          >
            <Button
              disabled={application.locked}
              icon={<EditOutlined />}
              onClick={() => openEdit(application)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={
              application.locked ? t`Application verrouillée` : t`Supprimer`
            }
          >
            <Button
              danger
              disabled={application.locked}
              icon={<DeleteOutlined />}
              onClick={() => confirmDelete(application)}
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
