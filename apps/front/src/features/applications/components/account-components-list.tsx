// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { ArrowRightOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { TableProps } from "antd";
import { Button, Empty, Flex, Table, Typography } from "antd";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { dtoEnums } from "@/api/generated/schema.enums";
import { actionsWidth, COL, scrollX } from "@/components/table/columns";
import {
  ComponentStatusTag,
  ComponentTypeTag,
} from "@/features/applications/components/component-tags";
import {
  COMPONENT_STATUS_LABELS,
  COMPONENT_TYPE_LABELS,
} from "@/features/applications/components/labels";
import { LockIndicator } from "@/features/lock/lock-indicator";
import { PAGE_SIZES, useListView } from "@/features/preferences/use-list-view";
import { EditableTagsCell } from "@/features/tags/editable-tags-cell";
import { useTagFilters } from "@/features/tags/use-tag-filters";
import { votesColumn } from "@/features/votes/votes-column";

type Component = components["schemas"]["ApplicationComponentListItem"];
type Status = components["schemas"]["ApplicationComponentStatus"];
type Type = components["schemas"]["ApplicationComponentType"];
type SortField = components["schemas"]["ApplicationComponentSortField"];

const SORT_FIELD: Record<string, SortField> = {
  title: "title",
  date: "date",
  status: "status",
  type: "type",
};

const LIST_KEY = ["get", "/v1/accounts/{account_id}/components"];

/**
 * Every component of the account, across applications — the entry point when
 * you think in terms of building blocks rather than of the application holding
 * them. Creation and edition stay inside the component's own application.
 */
export function AccountComponentsList({ accountId }: { accountId: string }) {
  const { t } = useLingui();
  const queryClient = useQueryClient();

  const view = useListView<Component, SortField>(
    accountId,
    "components",
    { filters: {}, limit: 25, page: 1, sortBy: "date", sortOrder: "desc" },
    SORT_FIELD
  );
  const statuses = (view.filterValue("status") ?? []) as Status[];
  const types = (view.filterValue("type") ?? []) as Type[];
  const tagIds = view.filterValue("tags") ?? [];
  const myVote = view.firstFilterValue("votes");

  const tagFilters = useTagFilters(accountId, "application_component");

  const componentsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/components",
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

  const tagsMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/applications/{application_id}/components/{component_id}",
    { meta: { successMessage: t`Tags mis à jour` } }
  );

  async function changeTags(component: Component, next: string[]) {
    await tagsMutation.mutateAsync({
      params: {
        path: {
          account_id: accountId,
          application_id: component.applicationId,
          component_id: component.id,
        },
      },
      body: { tagIds: next },
    });
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
  }

  const componentsList = componentsQuery.data?.items ?? [];
  const total = componentsQuery.data?.count ?? 0;
  const loading = !view.ready || componentsQuery.isLoading;

  const columns: TableProps<Component>["columns"] = [
    {
      title: t`Titre`,
      key: "title",
      dataIndex: "title",
      sorter: true,
      sortOrder: view.sortOrderFor("title"),
      width: COL.title,
      ellipsis: true,
      render: (title: string, component) => (
        <Flex align="center" gap={6}>
          <LockIndicator
            locked={component.locked}
            lockedBy={component.lockedBy}
            lockedDate={component.lockedDate}
          />
          <Typography.Text ellipsis strong>
            {title}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: t`Application`,
      key: "applicationTitle",
      dataIndex: "applicationTitle",
      width: COL.title,
      ellipsis: true,
      render: (applicationTitle: string | null, component) =>
        applicationTitle ? (
          <Link
            params={{ accountId, applicationId: component.applicationId }}
            to="/accounts/$accountId/applications/$applicationId/components"
          >
            {applicationTitle}
          </Link>
        ) : (
          <Typography.Text type="secondary">{t`Application supprimée`}</Typography.Text>
        ),
    },
    {
      title: t`Type`,
      key: "type",
      dataIndex: "type",
      sorter: true,
      sortOrder: view.sortOrderFor("type"),
      width: COL.type,
      filters: dtoEnums.ApplicationComponentType.map((value) => ({
        text: t(COMPONENT_TYPE_LABELS[value]),
        value,
      })),
      filteredValue: view.filterValue("type"),
      render: (type: Type) => <ComponentTypeTag type={type} />,
    },
    {
      title: t`Statut`,
      key: "status",
      dataIndex: "status",
      sorter: true,
      sortOrder: view.sortOrderFor("status"),
      width: COL.status,
      filters: dtoEnums.ApplicationComponentStatus.map((value) => ({
        text: t(COMPONENT_STATUS_LABELS[value]),
        value,
      })),
      filteredValue: view.filterValue("status"),
      render: (status: Status) => <ComponentStatusTag status={status} />,
    },
    {
      title: t`Tags`,
      key: "tags",
      dataIndex: "tags",
      width: COL.tags,
      filters: tagFilters,
      filteredValue: view.filterValue("tags"),
      render: (tags: Component["tags"], component) => (
        <EditableTagsCell
          accountId={accountId}
          entityType="application_component"
          loading={tagsMutation.isPending}
          onChange={(next) => changeTags(component, next)}
          readOnly={component.locked}
          tags={tags}
          value={component.tagIds}
        />
      ),
    },
    votesColumn({ t, notVotedLabel: t`Pas encore voté`, myVote }),
    {
      title: "",
      key: "actions",
      align: "right",
      fixed: "right",
      width: actionsWidth({ labelled: 1 }),
      render: (_, component) => (
        <Link
          params={{ accountId, applicationId: component.applicationId }}
          to="/accounts/$accountId/applications/$applicationId/components"
        >
          <Button icon={<ArrowRightOutlined />} iconPosition="end" size="small">
            {t`Accéder`}
          </Button>
        </Link>
      ),
    },
  ];

  if (total === 0 && !(view.hasFilters || loading)) {
    return (
      <Flex gap={16} vertical>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t`Composants`}
        </Typography.Title>
        <Empty
          description={t`Aucun composant sur ce compte. Les composants se créent depuis une application.`}
        >
          <Link params={{ accountId }} to="/accounts/$accountId/applications">
            <Button type="primary">{t`Voir les applications`}</Button>
          </Link>
        </Empty>
      </Flex>
    );
  }

  return (
    <Flex gap={16} vertical>
      <Typography.Title level={3} style={{ margin: 0 }}>
        {t`Composants`}
      </Typography.Title>

      <Table<Component>
        columns={columns}
        dataSource={componentsList}
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
    </Flex>
  );
}
