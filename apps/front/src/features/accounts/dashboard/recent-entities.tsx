// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { Card, Empty, Flex, List, Tabs, Typography } from "antd";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { OwnerCell } from "@/features/accounts/owner-cell";
import {
  FeatureStatusTag,
  FeatureTypeTag,
} from "@/features/features/feature-tags";
import {
  JourneyStatusTag,
  ScenarioStatusTag,
} from "@/features/journeys/journey-tags";

type Owner = components["schemas"]["OwnerItem"];

const RECENT_LIMIT = 10;
const OWNER_SIZE = 20;

/** A single compact row: title (linked) + a tag on the right, owner + date below. */
function RecentRow({
  title,
  to,
  params,
  tag,
  owner,
  date,
}: {
  title: string;
  to: string;
  params: Record<string, string>;
  tag: ReactNode;
  owner: Owner;
  date: string;
}) {
  return (
    <List.Item>
      <Flex gap={4} style={{ minWidth: 0, width: "100%" }} vertical>
        <Flex align="center" gap={8} justify="space-between">
          <Link params={params} style={{ minWidth: 0 }} to={to}>
            <Typography.Text ellipsis strong>
              {title}
            </Typography.Text>
          </Link>
          {tag}
        </Flex>
        <Flex align="center" gap={8} justify="space-between">
          <OwnerCell owner={owner} size={OWNER_SIZE} />
          <Typography.Text
            style={{ fontSize: 12, whiteSpace: "nowrap" }}
            type="secondary"
          >
            {dayjs(date).format("DD/MM/YYYY")}
          </Typography.Text>
        </Flex>
      </Flex>
    </List.Item>
  );
}

function RecentFeatures({ accountId }: { accountId: string }) {
  const { t } = useLingui();
  const query = $api.useQuery("get", "/v1/accounts/{account_id}/features", {
    params: {
      path: { account_id: accountId },
      query: {
        page: 1,
        limit: RECENT_LIMIT,
        sortBy: "date",
        sortOrder: "desc",
      },
    },
  });
  const items = query.data?.items ?? [];

  return (
    <List
      dataSource={items}
      loading={query.isLoading}
      locale={{ emptyText: <Empty description={t`Aucune fonctionnalité`} /> }}
      renderItem={(feature) => (
        <RecentRow
          date={feature.date}
          owner={feature.owner}
          params={{ accountId, featureId: feature.id }}
          tag={
            <Flex gap={4}>
              <FeatureTypeTag type={feature.type} />
              <FeatureStatusTag status={feature.status} />
            </Flex>
          }
          title={feature.title}
          to="/accounts/$accountId/features/$featureId"
        />
      )}
      size="small"
    />
  );
}

function RecentJourneys({ accountId }: { accountId: string }) {
  const { t } = useLingui();
  const query = $api.useQuery("get", "/v1/accounts/{account_id}/journeys", {
    params: {
      path: { account_id: accountId },
      query: {
        page: 1,
        limit: RECENT_LIMIT,
        sortBy: "date",
        sortOrder: "desc",
      },
    },
  });
  const items = query.data?.items ?? [];

  return (
    <List
      dataSource={items}
      loading={query.isLoading}
      locale={{ emptyText: <Empty description={t`Aucun parcours`} /> }}
      renderItem={(journey) => (
        <RecentRow
          date={journey.date}
          owner={journey.owner}
          params={{ accountId, journeyId: journey.id }}
          tag={<JourneyStatusTag status={journey.status} />}
          title={journey.title}
          to="/accounts/$accountId/journeys/$journeyId"
        />
      )}
      size="small"
    />
  );
}

function RecentScenarios({ accountId }: { accountId: string }) {
  const { t } = useLingui();
  const query = $api.useQuery("get", "/v1/accounts/{account_id}/scenarios", {
    params: {
      path: { account_id: accountId },
      query: {
        page: 1,
        limit: RECENT_LIMIT,
        sortBy: "date",
        sortOrder: "desc",
      },
    },
  });
  const items = query.data?.items ?? [];

  return (
    <List
      dataSource={items}
      loading={query.isLoading}
      locale={{ emptyText: <Empty description={t`Aucun scénario`} /> }}
      renderItem={(scenario) => (
        <RecentRow
          date={scenario.date}
          // Scenarios have no standalone page — link to their parent journey.
          owner={scenario.owner}
          params={{ accountId, journeyId: scenario.journeyId }}
          tag={<ScenarioStatusTag status={scenario.status} />}
          title={scenario.title}
          to="/accounts/$accountId/journeys/$journeyId"
        />
      )}
      size="small"
    />
  );
}

/** The "latest work" panel: newest features, journeys and scenarios, tabbed. */
export function RecentEntities({ accountId }: { accountId: string }) {
  const { t } = useLingui();

  return (
    <Card size="small" title={t`Dernières créations`}>
      <Tabs
        items={[
          {
            key: "features",
            label: t`Fonctionnalités`,
            children: <RecentFeatures accountId={accountId} />,
          },
          {
            key: "journeys",
            label: t`Parcours`,
            children: <RecentJourneys accountId={accountId} />,
          },
          {
            key: "scenarios",
            label: t`Scénarios`,
            children: <RecentScenarios accountId={accountId} />,
          },
        ]}
        size="small"
      />
    </Card>
  );
}
