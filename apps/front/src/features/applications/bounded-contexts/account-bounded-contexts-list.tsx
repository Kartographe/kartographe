// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { ArrowRightOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import type { TableProps } from "antd";
import { Button, Empty, Flex, Table, Tag, Typography } from "antd";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { actionsWidth, COL, scrollX } from "@/components/table/columns";
import { complexityColumn } from "@/features/complexity/complexity-column";
import { LockIndicator } from "@/features/lock/lock-indicator";
import { PAGE_SIZES, useListView } from "@/features/preferences/use-list-view";
import { votesColumn } from "@/features/votes/votes-column";

type BoundedContext =
  components["schemas"]["ApplicationBoundedContextListItem"];
type SortField = components["schemas"]["ApplicationBoundedContextSortField"];

const SORT_FIELD: Record<string, SortField> = {
  title: "title",
  date: "date",
};

/**
 * Every bounded context of the account, across applications. Creation and
 * edition stay inside the context's own application, where the components it
 * can hold live.
 */
export function AccountBoundedContextsList({
  accountId,
}: {
  accountId: string;
}) {
  const { t } = useLingui();

  const view = useListView<BoundedContext, SortField>(
    accountId,
    "boundedContexts",
    { filters: {}, limit: 25, page: 1, sortBy: "date", sortOrder: "desc" },
    SORT_FIELD
  );
  const myVote = view.firstFilterValue("votes");
  const myComplexity = view.firstFilterValue("complexity");

  const contextsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/bounded-contexts",
    {
      params: {
        path: { account_id: accountId },
        query: {
          page: view.page,
          limit: view.limit,
          sortBy: view.sortBy,
          sortOrder: view.sortOrder,
          ...(myVote ? { myVote } : {}),
          ...(myComplexity ? { myComplexity } : {}),
        },
      },
    },
    { enabled: view.ready }
  );

  const contexts = contextsQuery.data?.items ?? [];
  const total = contextsQuery.data?.count ?? 0;
  const loading = !view.ready || contextsQuery.isLoading;

  const columns: TableProps<BoundedContext>["columns"] = [
    {
      title: t`Titre`,
      key: "title",
      dataIndex: "title",
      sorter: true,
      sortOrder: view.sortOrderFor("title"),
      width: COL.title,
      ellipsis: true,
      render: (title: string, context) => (
        <Flex align="center" gap={6}>
          <LockIndicator
            locked={context.locked}
            lockedBy={context.lockedBy}
            lockedDate={context.lockedDate}
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
      render: (applicationTitle: string | null, context) =>
        applicationTitle ? (
          <Link
            params={{ accountId, applicationId: context.applicationId }}
            to="/accounts/$accountId/applications/$applicationId/bounded-contexts"
          >
            {applicationTitle}
          </Link>
        ) : (
          <Typography.Text type="secondary">{t`Application supprimée`}</Typography.Text>
        ),
    },
    {
      title: t`Composants`,
      key: "applicationComponentIds",
      dataIndex: "applicationComponentIds",
      width: COL.status,
      // Titles live in the application's component listing; across applications
      // the useful signal is how wide the boundary is.
      render: (ids: string[]) => <Tag>{ids.length}</Tag>,
    },
    votesColumn({ t, notVotedLabel: t`Pas encore voté`, myVote }),
    complexityColumn({ t, myComplexity }),
    {
      title: "",
      key: "actions",
      align: "right",
      fixed: "right",
      width: actionsWidth({ labelled: 1 }),
      render: (_, context) => (
        <Link
          params={{ accountId, applicationId: context.applicationId }}
          to="/accounts/$accountId/applications/$applicationId/bounded-contexts"
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
          {t`Contextes bornés`}
        </Typography.Title>
        <Empty
          description={t`Aucun contexte borné sur ce compte. Ils se créent depuis une application.`}
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
        {t`Contextes bornés`}
      </Typography.Title>

      <Table<BoundedContext>
        columns={columns}
        dataSource={contexts}
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
