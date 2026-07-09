import {
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
import { FeatureFormModal } from "@/features/features/feature-form-modal";
import {
  FeatureStatusTag,
  FeatureTypeTag,
} from "@/features/features/feature-tags";
import {
  FEATURE_STATUS_LABELS,
  FEATURE_TYPE_LABELS,
} from "@/features/features/labels";

type Feature = components["schemas"]["FeatureItem"];
type Status = components["schemas"]["FeatureStatus"];
type Type = components["schemas"]["FeatureType"];
type SortField = components["schemas"]["FeatureSortField"];
type SortOrder = components["schemas"]["SortOrder"];

const LIST_KEY = ["get", "/v1/accounts/{account_id}/features"];

const SORT_FIELD: Record<string, SortField> = {
  title: "title",
  date: "date",
  status: "status",
  type: "type",
};

export function FeaturesList({ accountId }: { accountId: string }) {
  const { t } = useLingui();
  const { modal } = App.useApp();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Feature | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<10 | 25 | 50 | 100>(25);
  const [sortBy, setSortBy] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [types, setTypes] = useState<Type[]>([]);

  const featuresQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/features",
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
    "post",
    "/v1/accounts/{account_id}/features/{feature_id}/activate",
    { meta: { successMessage: t`Fonctionnalité activée` } }
  );
  const archiveMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/features/{feature_id}/archive",
    { meta: { successMessage: t`Fonctionnalité archivée` } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/features/{feature_id}",
    { meta: { successMessage: t`Fonctionnalité supprimée` } }
  );

  const features = featuresQuery.data?.items ?? [];
  const total = featuresQuery.data?.count ?? 0;
  const hasFilters = statuses.length > 0 || types.length > 0;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
  }

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(feature: Feature) {
    setEditing(feature);
    setFormOpen(true);
  }

  async function toggleStatus(feature: Feature) {
    const params = { path: { account_id: accountId, feature_id: feature.id } };
    if (feature.status === "archived") {
      await activateMutation.mutateAsync({ params });
    } else {
      await archiveMutation.mutateAsync({ params });
    }
    invalidate();
  }

  function confirmDelete(feature: Feature) {
    modal.confirm({
      title: t`Supprimer ${feature.title} ?`,
      content: t`Ses fichiers et ses liens vers les parcours seront supprimés également. Cette action est irréversible.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: { account_id: accountId, feature_id: feature.id } },
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

  const onChange: TableProps<Feature>["onChange"] = (
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
    <FeatureFormModal
      accountId={accountId}
      feature={editing}
      key={editing?.id ?? "create"}
      onClose={() => setFormOpen(false)}
      open={formOpen}
    />
  );

  if (total === 0 && !hasFilters && !featuresQuery.isLoading) {
    return (
      <Flex gap={16} vertical>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t`Fonctionnalités`}
        </Typography.Title>
        <Empty description={t`Aucune fonctionnalité sur ce compte`}>
          <Button icon={<PlusOutlined />} onClick={openCreate} type="primary">
            {t`Créer une fonctionnalité`}
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
          {t`Fonctionnalités`}
        </Typography.Title>
        <Button icon={<PlusOutlined />} onClick={openCreate} type="primary">
          {t`Créer une fonctionnalité`}
        </Button>
      </Flex>

      <Table<Feature>
        columns={[
          {
            title: t`Titre`,
            key: "title",
            dataIndex: "title",
            sorter: true,
            sortOrder: antdOrder("title"),
            render: (title: string, feature) => (
              <Link
                params={{ accountId, featureId: feature.id }}
                to="/accounts/$accountId/features/$featureId"
              >
                <Typography.Text strong>{title}</Typography.Text>
              </Link>
            ),
          },
          {
            title: t`Type`,
            key: "type",
            dataIndex: "type",
            sorter: true,
            sortOrder: antdOrder("type"),
            filters: dtoEnums.FeatureType.map((value) => ({
              text: t(FEATURE_TYPE_LABELS[value]),
              value,
            })),
            filteredValue: types.length ? types : null,
            render: (type: Type) => <FeatureTypeTag type={type} />,
          },
          {
            title: t`Statut`,
            key: "status",
            dataIndex: "status",
            sorter: true,
            sortOrder: antdOrder("status"),
            filters: dtoEnums.FeatureStatus.map((value) => ({
              text: t(FEATURE_STATUS_LABELS[value]),
              value,
            })),
            filteredValue: statuses.length ? statuses : null,
            render: (status: Status) => <FeatureStatusTag status={status} />,
          },
          {
            title: t`Créée le`,
            key: "date",
            dataIndex: "date",
            sorter: true,
            sortOrder: antdOrder("date"),
            render: (value: string | null) =>
              value ? dayjs(value).format("DD/MM/YYYY") : "—",
          },
          {
            title: "",
            key: "actions",
            align: "right",
            render: (_, feature) => (
              <Space>
                <Tooltip title={t`Modifier`}>
                  <Button
                    icon={<EditOutlined />}
                    onClick={() => openEdit(feature)}
                    size="small"
                  />
                </Tooltip>
                <Tooltip
                  title={
                    feature.status === "archived" ? t`Activer` : t`Archiver`
                  }
                >
                  <Button
                    icon={
                      feature.status === "archived" ? (
                        <RocketOutlined />
                      ) : (
                        <InboxOutlined />
                      )
                    }
                    onClick={() => toggleStatus(feature)}
                    size="small"
                  />
                </Tooltip>
                <Tooltip title={t`Supprimer`}>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => confirmDelete(feature)}
                    size="small"
                  />
                </Tooltip>
              </Space>
            ),
          },
        ]}
        dataSource={features}
        loading={featuresQuery.isLoading}
        onChange={onChange}
        pagination={{
          current: page,
          pageSize: limit,
          total,
          showSizeChanger: true,
          pageSizeOptions: [10, 25, 50, 100],
        }}
        rowKey="id"
        size="small"
      />

      {formModal}
    </Flex>
  );
}
