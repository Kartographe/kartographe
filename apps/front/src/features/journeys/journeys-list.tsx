// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { ArrowRightOutlined, PlusOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { TableProps } from "antd";
import { Button, Empty, Flex, Table, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { dtoEnums } from "@/api/generated/schema.enums";
import { actionsWidth, COL, scrollX } from "@/components/table/columns";
import { EditablePersonasCell } from "@/features/journeys/editable-personas-cell";
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
import { LockIndicator } from "@/features/lock/lock-indicator";
import { LockToggleButton } from "@/features/lock/lock-toggle-button";
import { useCanManageLock } from "@/features/lock/use-can-manage-lock";
import { EditableTagsCell } from "@/features/tags/editable-tags-cell";
import { useTagFilters } from "@/features/tags/use-tag-filters";

type Journey = components["schemas"]["JourneyItem"];
type Status = components["schemas"]["JourneyStatus"];
type Type = components["schemas"]["JourneyType"];
type SortField = components["schemas"]["JourneySortField"];
type SortOrder = components["schemas"]["SortOrder"];

const LIST_KEY = ["get", "/v1/accounts/{account_id}/journeys"];

/** Roomier than `COL.title` (240) — Titre is fixed while Personas takes the slack. */
const TITLE_WIDTH = 360;

const SORT_FIELD: Record<string, SortField> = {
  title: "title",
  date: "date",
  status: "status",
  type: "type",
};

export function JourneysList({ accountId }: { accountId: string }) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const personas = usePersonas(accountId);

  const [formOpen, setFormOpen] = useState(false);
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
  const typeMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/journeys/{journey_id}",
    { meta: { successMessage: t`Type mis à jour` } }
  );
  const tagsMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/journeys/{journey_id}",
    { meta: { successMessage: t`Tags mis à jour` } }
  );
  const personasMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/journeys/{journey_id}",
    { meta: { successMessage: t`Personas mis à jour` } }
  );
  const lockMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/journeys/{journey_id}/lock",
    { meta: { successMessage: t`Parcours verrouillé` } }
  );
  const unlockMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/journeys/{journey_id}/unlock",
    { meta: { successMessage: t`Parcours déverrouillé` } }
  );

  const canManageLock = useCanManageLock(accountId);
  const lockPending = lockMutation.isPending || unlockMutation.isPending;

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
    setFormOpen(true);
  }

  async function changeStatus(journey: Journey, status: Status) {
    await statusMutation.mutateAsync({
      params: { path: { account_id: accountId, journey_id: journey.id } },
      body: { status },
    });
    invalidate();
  }

  async function changeType(journey: Journey, type: Type) {
    await typeMutation.mutateAsync({
      params: { path: { account_id: accountId, journey_id: journey.id } },
      body: { type },
    });
    invalidate();
  }

  async function changeTags(journey: Journey, tagIds: string[]) {
    await tagsMutation.mutateAsync({
      params: { path: { account_id: accountId, journey_id: journey.id } },
      body: { tagIds },
    });
    invalidate();
  }

  async function changePersonas(journey: Journey, personasIds: string[]) {
    await personasMutation.mutateAsync({
      params: { path: { account_id: accountId, journey_id: journey.id } },
      body: { personasIds },
    });
    invalidate();
  }

  async function toggleLock(journey: Journey) {
    const mutation = journey.locked ? unlockMutation : lockMutation;
    await mutation.mutateAsync({
      params: { path: { account_id: accountId, journey_id: journey.id } },
    });
    invalidate();
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
      key={formOpen ? "open" : "closed"}
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
      // Wider than the shared default: with Personas now the flexible column,
      // Titre no longer grows with the viewport, so it needs the room upfront.
      width: TITLE_WIDTH,
      ellipsis: true,
      render: (title: string, journey) => (
        <Flex align="center" gap={6}>
          <LockIndicator
            locked={journey.locked}
            lockedBy={journey.lockedBy}
            lockedDate={journey.lockedDate}
          />
          <Typography.Text ellipsis>{title}</Typography.Text>
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
      filters: dtoEnums.JourneyType.map((value) => ({
        text: t(JOURNEY_TYPE_LABELS[value]),
        value,
      })),
      filteredValue: types.length ? types : null,
      render: (type: Type, journey) => (
        <JourneyTypeTag
          loading={typeMutation.isPending}
          onChange={
            journey.locked ? undefined : (next) => changeType(journey, next)
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
          onChange={
            journey.locked ? undefined : (next) => changeStatus(journey, next)
          }
          status={status}
        />
      ),
    },
    {
      // No `width`: `table-layout: fixed` hands the leftover space to the sole
      // width-less column, so Personas stretches to fill the table. `scrollX`
      // below reserves it a floor so it never collapses at the breakpoint.
      title: t`Personas`,
      key: "personasIds",
      dataIndex: "personasIds",
      filters: personas.filters,
      filteredValue: personasIds.length ? personasIds : null,
      render: (_ids: string[], journey) => (
        <EditablePersonasCell
          accountId={accountId}
          loading={personasMutation.isPending}
          onChange={(next) => changePersonas(journey, next)}
          readOnly={journey.locked}
          value={journey.personasIds}
          wrap={false}
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
      render: (tags: Journey["tags"], journey) => (
        <EditableTagsCell
          accountId={accountId}
          entityType="journey"
          loading={tagsMutation.isPending}
          onChange={(next) => changeTags(journey, next)}
          readOnly={journey.locked}
          tags={tags}
          value={journey.tagIds}
        />
      ),
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
      width: actionsWidth({ icons: canManageLock ? 1 : 0, labelled: 1 }),
      render: (_, journey) => (
        <Flex align="center" gap={4} justify="flex-end">
          {canManageLock ? (
            <LockToggleButton
              locked={journey.locked}
              onToggle={() => toggleLock(journey)}
              pending={lockPending}
            />
          ) : null}
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
        </Flex>
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
        scroll={scrollX(columns, COL.tags)}
        size="small"
      />

      {formModal}
    </Flex>
  );
}
