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
import { complexityColumn } from "@/features/complexity/complexity-column";
import { LockIndicator } from "@/features/lock/lock-indicator";
import { LockToggleButton } from "@/features/lock/lock-toggle-button";
import { useCanManageLock } from "@/features/lock/use-can-manage-lock";
import { PAGE_SIZES, useListView } from "@/features/preferences/use-list-view";
import {
  SERVICE_CATEGORY_LABELS,
  SERVICE_STATUS_LABELS,
  SERVICE_TYPE_LABELS,
} from "@/features/services/labels";
import { ServiceFormModal } from "@/features/services/service-form-modal";
import {
  ServiceCategoryTag,
  ServiceStatusTag,
  ServiceTypeTag,
} from "@/features/services/service-tags";
import { votesColumn } from "@/features/votes/votes-column";

type Service = components["schemas"]["ServiceItem"];
type Status = components["schemas"]["ServiceStatus"];
type Type = components["schemas"]["ServiceType"];
type Category = components["schemas"]["ServiceCategory"];
type SortField = components["schemas"]["ServiceSortField"];

const SORT_FIELD: Record<string, SortField> = {
  title: "title",
  date: "date",
  status: "status",
  type: "type",
  category: "category",
};

export function ServicesList({ accountId }: { accountId: string }) {
  const { t } = useLingui();
  const { modal } = App.useApp();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Service | undefined>(undefined);
  const view = useListView<Service, SortField>(
    accountId,
    "services",
    { filters: {}, limit: 25, page: 1, sortBy: "date", sortOrder: "desc" },
    SORT_FIELD
  );
  const statuses = (view.filterValue("status") ?? []) as Status[];
  const types = (view.filterValue("type") ?? []) as Type[];
  const categories = (view.filterValue("category") ?? []) as Category[];
  const myVote = view.firstFilterValue("votes");
  const myComplexity = view.firstFilterValue("complexity");

  const servicesQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/services",
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
          ...(categories.length ? { category: categories } : {}),
          ...(myVote ? { myVote } : {}),
          ...(myComplexity ? { myComplexity } : {}),
        },
      },
    },
    { enabled: view.ready }
  );

  const statusMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/services/{service_id}",
    { meta: { successMessage: t`Statut mis à jour` } }
  );
  const typeMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/services/{service_id}",
    { meta: { successMessage: t`Type mis à jour` } }
  );
  const categoryMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/services/{service_id}",
    { meta: { successMessage: t`Catégorie mise à jour` } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/services/{service_id}",
    { meta: { successMessage: t`Service supprimé` } }
  );
  const lockMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/services/{service_id}/lock",
    { meta: { successMessage: t`Service verrouillé` } }
  );
  const unlockMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/services/{service_id}/unlock",
    { meta: { successMessage: t`Service déverrouillé` } }
  );

  const canManageLock = useCanManageLock(accountId);
  const lockPending = lockMutation.isPending || unlockMutation.isPending;

  const services = servicesQuery.data?.items ?? [];
  const total = servicesQuery.data?.count ?? 0;
  const loading = !view.ready || servicesQuery.isLoading;

  function invalidate() {
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/services"],
    });
  }

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(service: Service) {
    setEditing(service);
    setFormOpen(true);
  }

  async function changeStatus(service: Service, status: Status) {
    await statusMutation.mutateAsync({
      params: { path: { account_id: accountId, service_id: service.id } },
      body: { status },
    });
    invalidate();
  }

  async function changeType(service: Service, type: Type) {
    await typeMutation.mutateAsync({
      params: { path: { account_id: accountId, service_id: service.id } },
      body: { type },
    });
    invalidate();
  }

  async function changeCategory(service: Service, category: Category) {
    await categoryMutation.mutateAsync({
      params: { path: { account_id: accountId, service_id: service.id } },
      body: { category },
    });
    invalidate();
  }

  async function toggleLock(service: Service) {
    const mutation = service.locked ? unlockMutation : lockMutation;
    await mutation.mutateAsync({
      params: { path: { account_id: accountId, service_id: service.id } },
    });
    invalidate();
  }

  function confirmDelete(service: Service) {
    modal.confirm({
      title: t`Supprimer ${service.title} ?`,
      content: t`Ses actions seront supprimées également. Cette action est irréversible.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: { account_id: accountId, service_id: service.id } },
        });
        invalidate();
      },
    });
  }

  const formModal = (
    <ServiceFormModal
      accountId={accountId}
      key={editing?.id ?? "create"}
      onClose={() => setFormOpen(false)}
      open={formOpen}
      service={editing}
    />
  );

  const columns: TableProps<Service>["columns"] = [
    {
      title: t`Titre`,
      key: "title",
      dataIndex: "title",
      sorter: true,
      sortOrder: view.sortOrderFor("title"),
      width: COL.title,
      render: (title: string, service) => (
        <Flex vertical>
          <Flex align="center" gap={6}>
            <LockIndicator
              locked={service.locked}
              lockedBy={service.lockedBy}
              lockedDate={service.lockedDate}
            />
            <Typography.Text ellipsis>{title}</Typography.Text>
          </Flex>
          {service.url ? (
            <Typography.Text ellipsis style={{ fontSize: 12 }} type="secondary">
              {service.url}
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
      filters: dtoEnums.ServiceType.map((value) => ({
        text: t(SERVICE_TYPE_LABELS[value]),
        value,
      })),
      filteredValue: view.filterValue("type"),
      render: (type: Type, service) => (
        <ServiceTypeTag
          loading={typeMutation.isPending}
          onChange={
            service.locked ? undefined : (next) => changeType(service, next)
          }
          type={type}
        />
      ),
    },
    {
      title: t`Catégorie`,
      key: "category",
      dataIndex: "category",
      sorter: true,
      sortOrder: view.sortOrderFor("category"),
      width: COL.type,
      filters: dtoEnums.ServiceCategory.map((value) => ({
        text: t(SERVICE_CATEGORY_LABELS[value]),
        value,
      })),
      filteredValue: view.filterValue("category"),
      render: (category: Category, service) => (
        <ServiceCategoryTag
          category={category}
          loading={categoryMutation.isPending}
          onChange={
            service.locked ? undefined : (next) => changeCategory(service, next)
          }
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
      filters: dtoEnums.ServiceStatus.map((value) => ({
        text: t(SERVICE_STATUS_LABELS[value]),
        value,
      })),
      filteredValue: view.filterValue("status"),
      render: (status: Status, service) => (
        <ServiceStatusTag
          loading={statusMutation.isPending}
          onChange={
            service.locked ? undefined : (next) => changeStatus(service, next)
          }
          status={status}
        />
      ),
    },
    {
      title: t`Créé le`,
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
      render: (_, service) => (
        <Space>
          {canManageLock ? (
            <LockToggleButton
              locked={service.locked}
              onToggle={() => toggleLock(service)}
              pending={lockPending}
            />
          ) : null}
          <Link
            params={{ accountId, serviceId: service.id }}
            to="/accounts/$accountId/services/$serviceId/comments"
          >
            <CommentCountButton count={service.commentCount} />
          </Link>
          <Link
            params={{ accountId, serviceId: service.id }}
            to="/accounts/$accountId/services/$serviceId"
          >
            <Button
              icon={<ArrowRightOutlined />}
              iconPosition="end"
              size="small"
            >
              {t`Accéder`}
            </Button>
          </Link>
          <Tooltip title={service.locked ? t`Service verrouillé` : t`Modifier`}>
            <Button
              disabled={service.locked}
              icon={<EditOutlined />}
              onClick={() => openEdit(service)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={service.locked ? t`Service verrouillé` : t`Supprimer`}
          >
            <Button
              danger
              disabled={service.locked}
              icon={<DeleteOutlined />}
              onClick={() => confirmDelete(service)}
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
          {t`Services`}
        </Typography.Title>
        <Empty description={t`Aucun service sur ce compte`}>
          <Button icon={<PlusOutlined />} onClick={openCreate} type="primary">
            {t`Créer un service`}
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
          {t`Services`}
        </Typography.Title>
        <Button icon={<PlusOutlined />} onClick={openCreate} type="primary">
          {t`Créer un service`}
        </Button>
      </Flex>

      <Table<Service>
        columns={columns}
        dataSource={services}
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
