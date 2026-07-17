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
import {
  SERVICE_STATUS_LABELS,
  SERVICE_TYPE_LABELS,
} from "@/features/services/labels";
import { ServiceFormModal } from "@/features/services/service-form-modal";
import {
  ServiceStatusTag,
  ServiceTypeTag,
} from "@/features/services/service-tags";

type Service = components["schemas"]["ServiceItem"];
type Status = components["schemas"]["ServiceStatus"];
type Type = components["schemas"]["ServiceType"];
type SortField = components["schemas"]["ServiceSortField"];
type SortOrder = components["schemas"]["SortOrder"];

const SORT_FIELD: Record<string, SortField> = {
  title: "title",
  date: "date",
  status: "status",
  type: "type",
};

export function ServicesList({ accountId }: { accountId: string }) {
  const { t } = useLingui();
  const { modal } = App.useApp();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Service | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<10 | 25 | 50 | 100>(25);
  const [sortBy, setSortBy] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [types, setTypes] = useState<Type[]>([]);

  const servicesQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/services",
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
        },
      },
    }
  );

  const activateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/services/{service_id}",
    { meta: { successMessage: t`Service activé` } }
  );
  const archiveMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/services/{service_id}",
    { meta: { successMessage: t`Service archivé` } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/services/{service_id}",
    { meta: { successMessage: t`Service supprimé` } }
  );

  const services = servicesQuery.data?.items ?? [];
  const total = servicesQuery.data?.count ?? 0;
  const hasFilters = statuses.length > 0 || types.length > 0;

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

  async function toggleStatus(service: Service) {
    const params = { path: { account_id: accountId, service_id: service.id } };
    if (service.status === "active") {
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

  const antdOrder = (field: SortField): "ascend" | "descend" | null => {
    if (sortBy !== field) {
      return null;
    }
    return sortOrder === "asc" ? "ascend" : "descend";
  };

  const onChange: TableProps<Service>["onChange"] = (
    pagination,
    filters,
    sorter
  ) => {
    setPage(pagination.current ?? 1);
    setLimit((pagination.pageSize as 10 | 25 | 50 | 100) ?? 25);
    setStatuses((filters.status as Status[] | null) ?? []);
    setTypes((filters.type as Type[] | null) ?? []);
    const single = Array.isArray(sorter) ? sorter[0] : sorter;
    if (single?.order && single.columnKey) {
      setSortBy(SORT_FIELD[String(single.columnKey)] ?? "date");
      setSortOrder(single.order === "ascend" ? "asc" : "desc");
    }
  };

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
      sortOrder: antdOrder("title"),
      width: COL.title,
      render: (title: string, service) => (
        <Flex vertical>
          <Typography.Text ellipsis>{title}</Typography.Text>
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
      sortOrder: antdOrder("type"),
      width: COL.type,
      filters: dtoEnums.ServiceType.map((value) => ({
        text: t(SERVICE_TYPE_LABELS[value]),
        value,
      })),
      filteredValue: types.length ? types : null,
      render: (type: Type) => <ServiceTypeTag type={type} />,
    },
    {
      title: t`Statut`,
      key: "status",
      dataIndex: "status",
      sorter: true,
      sortOrder: antdOrder("status"),
      width: COL.status,
      filters: dtoEnums.ServiceStatus.map((value) => ({
        text: t(SERVICE_STATUS_LABELS[value]),
        value,
      })),
      filteredValue: statuses.length ? statuses : null,
      render: (status: Status) => <ServiceStatusTag status={status} />,
    },
    {
      title: t`Créé le`,
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
      render: (_, service) => (
        <Space>
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
          <Tooltip title={t`Modifier`}>
            <Button
              icon={<EditOutlined />}
              onClick={() => openEdit(service)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={service.status === "active" ? t`Archiver` : t`Activer`}
          >
            <Button
              icon={
                service.status === "active" ? (
                  <InboxOutlined />
                ) : (
                  <RocketOutlined />
                )
              }
              onClick={() => toggleStatus(service)}
              size="small"
            />
          </Tooltip>
          <Tooltip title={t`Supprimer`}>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => confirmDelete(service)}
              size="small"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (total === 0 && !hasFilters && !servicesQuery.isLoading) {
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
        loading={servicesQuery.isLoading}
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
