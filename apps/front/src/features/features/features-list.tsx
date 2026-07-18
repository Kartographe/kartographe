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
import { CommentCountButton } from "@/features/comments/comment-count-button";
import { FeatureFormModal } from "@/features/features/feature-form-modal";
import {
  FeatureStatusTag,
  FeatureTypeTag,
} from "@/features/features/feature-tags";
import {
  FEATURE_STATUS_LABELS,
  FEATURE_TYPE_LABELS,
} from "@/features/features/labels";
import { LockIndicator } from "@/features/lock/lock-indicator";
import { LockToggleButton } from "@/features/lock/lock-toggle-button";
import { useCanManageLock } from "@/features/lock/use-can-manage-lock";
import { EditableTagsCell } from "@/features/tags/editable-tags-cell";
import { useTagFilters } from "@/features/tags/use-tag-filters";
import { votesColumn } from "@/features/votes/votes-column";

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
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<10 | 25 | 50 | 100>(25);
  const [sortBy, setSortBy] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [myVote, setMyVote] = useState<string | null>(null);

  const tagFilters = useTagFilters(accountId, "feature");

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
          ...(tagIds.length ? { tagIds } : {}),
          ...(myVote ? { myVote } : {}),
        },
      },
    }
  );

  const statusMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/features/{feature_id}",
    { meta: { successMessage: t`Statut mis à jour` } }
  );
  const typeMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/features/{feature_id}",
    { meta: { successMessage: t`Type mis à jour` } }
  );
  const tagsMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/features/{feature_id}",
    { meta: { successMessage: t`Tags mis à jour` } }
  );
  const lockMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/features/{feature_id}/lock",
    { meta: { successMessage: t`Fonctionnalité verrouillée` } }
  );
  const unlockMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/features/{feature_id}/unlock",
    { meta: { successMessage: t`Fonctionnalité déverrouillée` } }
  );

  const canManageLock = useCanManageLock(accountId);
  const lockPending = lockMutation.isPending || unlockMutation.isPending;

  const features = featuresQuery.data?.items ?? [];
  const total = featuresQuery.data?.count ?? 0;
  const hasFilters =
    statuses.length > 0 || types.length > 0 || tagIds.length > 0;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
  }

  function openCreate() {
    setFormOpen(true);
  }

  async function changeStatus(feature: Feature, status: Status) {
    await statusMutation.mutateAsync({
      params: { path: { account_id: accountId, feature_id: feature.id } },
      body: { status },
    });
    invalidate();
  }

  async function changeType(feature: Feature, type: Type) {
    await typeMutation.mutateAsync({
      params: { path: { account_id: accountId, feature_id: feature.id } },
      body: { type },
    });
    invalidate();
  }

  async function changeTags(feature: Feature, tagIds: string[]) {
    await tagsMutation.mutateAsync({
      params: { path: { account_id: accountId, feature_id: feature.id } },
      body: { tagIds },
    });
    invalidate();
  }

  async function toggleLock(feature: Feature) {
    const mutation = feature.locked ? unlockMutation : lockMutation;
    await mutation.mutateAsync({
      params: { path: { account_id: accountId, feature_id: feature.id } },
    });
    invalidate();
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
    setTagIds((filters.tags as string[] | null) ?? []);
    setMyVote((filters.votes as string[] | null)?.[0] ?? null);
    const single = Array.isArray(sorter) ? sorter[0] : sorter;
    if (single?.order && single.columnKey) {
      setSortBy(SORT_FIELD[String(single.columnKey)] ?? "date");
      setSortOrder(single.order === "ascend" ? "asc" : "desc");
    }
  };

  const formModal = (
    <FeatureFormModal
      accountId={accountId}
      key={formOpen ? "open" : "closed"}
      onClose={() => setFormOpen(false)}
      open={formOpen}
    />
  );

  const columns: TableProps<Feature>["columns"] = [
    {
      title: t`Titre`,
      key: "title",
      dataIndex: "title",
      sorter: true,
      sortOrder: antdOrder("title"),
      width: COL.title,
      ellipsis: true,
      render: (title: string, feature) => (
        <Flex align="center" gap={6}>
          <LockIndicator
            locked={feature.locked}
            lockedBy={feature.lockedBy}
            lockedDate={feature.lockedDate}
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
      filters: dtoEnums.FeatureType.map((value) => ({
        text: t(FEATURE_TYPE_LABELS[value]),
        value,
      })),
      filteredValue: types.length ? types : null,
      render: (type: Type, feature) => (
        <FeatureTypeTag
          loading={typeMutation.isPending}
          onChange={
            feature.locked ? undefined : (next) => changeType(feature, next)
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
      filters: dtoEnums.FeatureStatus.map((value) => ({
        text: t(FEATURE_STATUS_LABELS[value]),
        value,
      })),
      filteredValue: statuses.length ? statuses : null,
      render: (status: Status, feature) => (
        <FeatureStatusTag
          loading={statusMutation.isPending}
          onChange={
            feature.locked ? undefined : (next) => changeStatus(feature, next)
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
      filteredValue: tagIds.length ? tagIds : null,
      render: (tags: Feature["tags"], feature) => (
        <EditableTagsCell
          accountId={accountId}
          entityType="feature"
          loading={tagsMutation.isPending}
          onChange={(next) => changeTags(feature, next)}
          readOnly={feature.locked}
          tags={tags}
          value={feature.tagIds}
        />
      ),
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
    votesColumn({ t, notVotedLabel: t`Pas encore voté`, myVote }),
    {
      title: "",
      key: "actions",
      align: "right",
      fixed: "right",
      width: actionsWidth({ icons: (canManageLock ? 1 : 0) + 1, labelled: 1 }),
      render: (_, feature) => (
        <Flex align="center" gap={4} justify="flex-end">
          {canManageLock ? (
            <LockToggleButton
              locked={feature.locked}
              onToggle={() => toggleLock(feature)}
              pending={lockPending}
            />
          ) : null}
          <Link
            params={{ accountId, featureId: feature.id }}
            to="/accounts/$accountId/features/$featureId/comments"
          >
            <CommentCountButton count={feature.commentCount} />
          </Link>
          <Link
            params={{ accountId, featureId: feature.id }}
            to="/accounts/$accountId/features/$featureId"
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
        columns={columns}
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
        scroll={scrollX(columns)}
        size="small"
      />

      {formModal}
    </Flex>
  );
}
