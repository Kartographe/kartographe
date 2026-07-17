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
  Tag,
  Tooltip,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { dtoEnums } from "@/api/generated/schema.enums";
import { actionsWidth, COL, scrollX } from "@/components/table/columns";
import { JourneyFormModal } from "@/features/journeys/journey-form-modal";
import {
  JourneyStatusTag,
  JourneyTypeTag,
} from "@/features/journeys/journey-tags";
import {
  JOURNEY_STATUS_LABELS,
  JOURNEY_TYPE_LABELS,
} from "@/features/journeys/labels";
import { usePersonas } from "@/features/journeys/use-personas";
import { TagsCell } from "@/features/tags/tags-cell";
import { useTagFilters } from "@/features/tags/use-tag-filters";

type Journey = components["schemas"]["JourneyItem"];
type Status = components["schemas"]["JourneyStatus"];
type Type = components["schemas"]["JourneyType"];
type SortField = components["schemas"]["JourneySortField"];
type SortOrder = components["schemas"]["SortOrder"];

const LIST_KEY = ["get", "/v1/accounts/{account_id}/journeys"];

const SORT_FIELD: Record<string, SortField> = {
  title: "title",
  date: "date",
  status: "status",
  type: "type",
};

export function JourneysList({ accountId }: { accountId: string }) {
  const { t } = useLingui();
  const { modal } = App.useApp();
  const queryClient = useQueryClient();
  const personas = usePersonas(accountId);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Journey | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<10 | 25 | 50 | 100>(25);
  const [sortBy, setSortBy] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [personasIds, setPersonasIds] = useState<string[]>([]);

  const tagFilters = useTagFilters(accountId, "journey");

  const journeysQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/journeys",
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
          ...(personasIds.length ? { personasIds } : {}),
        },
      },
    }
  );

  const statusMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/journeys/{journey_id}",
    { meta: { successMessage: t`Statut mis à jour` } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/journeys/{journey_id}",
    { meta: { successMessage: t`Parcours supprimé` } }
  );

  const journeys = journeysQuery.data?.items ?? [];
  const total = journeysQuery.data?.count ?? 0;
  const hasFilters =
    statuses.length > 0 ||
    types.length > 0 ||
    tagIds.length > 0 ||
    personasIds.length > 0;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
  }

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(journey: Journey) {
    setEditing(journey);
    setFormOpen(true);
  }

  async function changeStatus(journey: Journey, status: Status) {
    await statusMutation.mutateAsync({
      params: { path: { account_id: accountId, journey_id: journey.id } },
      body: { status },
    });
    invalidate();
  }

  function confirmDelete(journey: Journey) {
    modal.confirm({
      title: t`Supprimer ${journey.title} ?`,
      content: t`Ses scénarios et leurs étapes seront supprimés également. Cette action est irréversible.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: { account_id: accountId, journey_id: journey.id } },
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

  const onChange: TableProps<Journey>["onChange"] = (
    pagination,
    filters,
    sorter
  ) => {
    setPage(pagination.current ?? 1);
    setLimit((pagination.pageSize as 10 | 25 | 50 | 100) ?? 25);
    setStatuses((filters.status as Status[] | null) ?? []);
    setTypes((filters.type as Type[] | null) ?? []);
    setTagIds((filters.tags as string[] | null) ?? []);
    setPersonasIds((filters.personasIds as string[] | null) ?? []);
    const single = Array.isArray(sorter) ? sorter[0] : sorter;
    if (single?.order && single.columnKey) {
      setSortBy(SORT_FIELD[String(single.columnKey)] ?? "date");
      setSortOrder(single.order === "ascend" ? "asc" : "desc");
    }
  };

  const formModal = (
    <JourneyFormModal
      accountId={accountId}
      journey={editing}
      key={editing?.id ?? "create"}
      onClose={() => setFormOpen(false)}
      open={formOpen}
    />
  );

  const columns: TableProps<Journey>["columns"] = [
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
      title: t`Personas`,
      key: "personasIds",
      dataIndex: "personasIds",
      width: COL.tags,
      filters: personas.filters,
      filteredValue: personasIds.length ? personasIds : null,
      render: (ids: string[]) =>
        ids.length ? (
          <Flex gap={4} wrap>
            {ids.map((id) => (
              <Tag key={id} style={{ marginInlineEnd: 0 }}>
                {/* Beyond the personas page, the id itself says nothing. */}
                {personas.title(id) ?? t`Persona inconnu`}
              </Tag>
            ))}
          </Flex>
        ) : (
          "—"
        ),
    },
    {
      title: t`Type`,
      key: "type",
      dataIndex: "type",
      sorter: true,
      sortOrder: antdOrder("type"),
      width: COL.type,
      filters: dtoEnums.JourneyType.map((value) => ({
        text: t(JOURNEY_TYPE_LABELS[value]),
        value,
      })),
      filteredValue: types.length ? types : null,
      render: (type: Type) => <JourneyTypeTag type={type} />,
    },
    {
      title: t`Statut`,
      key: "status",
      dataIndex: "status",
      sorter: true,
      sortOrder: antdOrder("status"),
      width: COL.status,
      filters: dtoEnums.JourneyStatus.map((value) => ({
        text: t(JOURNEY_STATUS_LABELS[value]),
        value,
      })),
      filteredValue: statuses.length ? statuses : null,
      render: (status: Status, journey) => (
        <JourneyStatusTag
          loading={statusMutation.isPending}
          onChange={(next) => changeStatus(journey, next)}
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
      render: (tags: Journey["tags"]) => <TagsCell tags={tags} />,
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
      width: actionsWidth({ icons: 2, labelled: 1 }),
      render: (_, journey) => (
        <Space>
          <Link
            params={{ accountId, journeyId: journey.id }}
            to="/accounts/$accountId/journeys/$journeyId"
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
              onClick={() => openEdit(journey)}
              size="small"
            />
          </Tooltip>
          <Tooltip title={t`Supprimer`}>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => confirmDelete(journey)}
              size="small"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (total === 0 && !hasFilters && !journeysQuery.isLoading) {
    return (
      <Flex gap={16} vertical>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t`Parcours clients`}
        </Typography.Title>
        <Empty
          description={t`Aucun parcours sur ce compte. Décrivez ce que vos utilisateurs viennent accomplir.`}
        >
          <Button icon={<PlusOutlined />} onClick={openCreate} type="primary">
            {t`Créer un parcours`}
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
          {t`Parcours clients`}
        </Typography.Title>
        <Button icon={<PlusOutlined />} onClick={openCreate} type="primary">
          {t`Créer un parcours`}
        </Button>
      </Flex>

      <Table<Journey>
        columns={columns}
        dataSource={journeys}
        loading={journeysQuery.isLoading}
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
