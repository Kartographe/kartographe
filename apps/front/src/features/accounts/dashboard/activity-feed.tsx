// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import {
  Avatar,
  Card,
  Empty,
  Flex,
  List,
  Segmented,
  Tooltip,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { type ReactNode, useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import type { Typology } from "@/features/accounts/dashboard/metrics";
import { ownerName } from "@/features/accounts/owner-cell";
import { ApplicationStatusTag } from "@/features/applications/application-tags";
import { DatabaseStatusTag } from "@/features/databases/database-tags";
import { FeatureStatusTag } from "@/features/features/feature-tags";
import {
  JourneyStatusTag,
  ScenarioStatusTag,
} from "@/features/journeys/journey-tags";
import { LockIndicator } from "@/features/lock/lock-indicator";
import { ServiceStatusTag } from "@/features/services/service-tags";

type Owner = components["schemas"]["OwnerItem"];

const RECENT_LIMIT = 10;
const OWNER_SIZE = 22;

/** One activity item, on a single line: owner icon (name on hover), the linked
 * title that flexes and ellipsises, a status tag, and the creation date. */
function ActivityRow({
  title,
  to,
  params,
  tag,
  owner,
  date,
  locked,
  lockedBy,
  lockedDate,
}: {
  title: string;
  to: string;
  params: Record<string, string>;
  tag: ReactNode;
  owner: Owner;
  date: string;
  locked: boolean;
  lockedBy?: Owner | null;
  lockedDate?: string | null;
}) {
  const { t } = useLingui();
  const name = ownerName(owner, t`Utilisateur`);

  return (
    <List.Item style={{ paddingBlock: 6 }}>
      <Flex align="center" gap={8} style={{ minWidth: 0, width: "100%" }}>
        <Tooltip title={name}>
          <Avatar size={OWNER_SIZE} src={owner.pictureProfile ?? undefined}>
            {(name[0] ?? "?").toUpperCase()}
          </Avatar>
        </Tooltip>
        <LockIndicator
          locked={locked}
          lockedBy={lockedBy}
          lockedDate={lockedDate}
        />
        <Link params={params} style={{ flex: 1, minWidth: 0 }} to={to}>
          <Typography.Text ellipsis strong style={{ fontSize: 13 }}>
            {title}
          </Typography.Text>
        </Link>
        {tag}
        <Typography.Text
          style={{ fontSize: 12, whiteSpace: "nowrap" }}
          type="secondary"
        >
          {dayjs(date).format("DD/MM/YYYY")}
        </Typography.Text>
      </Flex>
    </List.Item>
  );
}

const RECENT_QUERY = {
  page: 1,
  limit: RECENT_LIMIT,
  sortBy: "date",
  sortOrder: "desc",
} as const;

function RecentFeatures({ accountId }: { accountId: string }) {
  const { t } = useLingui();
  const query = $api.useQuery("get", "/v1/accounts/{account_id}/features", {
    params: { path: { account_id: accountId }, query: RECENT_QUERY },
  });
  const items = query.data?.items ?? [];

  return (
    <List
      dataSource={items}
      loading={query.isLoading}
      locale={{ emptyText: <Empty description={t`Aucune fonctionnalité`} /> }}
      renderItem={(feature) => (
        <ActivityRow
          date={feature.date}
          locked={feature.locked}
          lockedBy={feature.lockedBy}
          lockedDate={feature.lockedDate}
          owner={feature.owner}
          params={{ accountId, featureId: feature.id }}
          tag={<FeatureStatusTag status={feature.status} />}
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
    params: { path: { account_id: accountId }, query: RECENT_QUERY },
  });
  const items = query.data?.items ?? [];

  return (
    <List
      dataSource={items}
      loading={query.isLoading}
      locale={{ emptyText: <Empty description={t`Aucun parcours`} /> }}
      renderItem={(journey) => (
        <ActivityRow
          date={journey.date}
          locked={journey.locked}
          lockedBy={journey.lockedBy}
          lockedDate={journey.lockedDate}
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
    params: { path: { account_id: accountId }, query: RECENT_QUERY },
  });
  const items = query.data?.items ?? [];

  return (
    <List
      dataSource={items}
      loading={query.isLoading}
      locale={{ emptyText: <Empty description={t`Aucun scénario`} /> }}
      renderItem={(scenario) => (
        <ActivityRow
          date={scenario.date}
          locked={scenario.locked}
          lockedBy={scenario.lockedBy}
          lockedDate={scenario.lockedDate}
          owner={scenario.owner}
          // Scenarios link to their exact page under the parent journey.
          params={{
            accountId,
            journeyId: scenario.journeyId,
            scenarioId: scenario.id,
          }}
          tag={<ScenarioStatusTag status={scenario.status} />}
          title={scenario.title}
          to="/accounts/$accountId/journeys/$journeyId/scenarios/$scenarioId"
        />
      )}
      size="small"
    />
  );
}

function RecentApplications({ accountId }: { accountId: string }) {
  const { t } = useLingui();
  const query = $api.useQuery("get", "/v1/accounts/{account_id}/applications", {
    params: { path: { account_id: accountId }, query: RECENT_QUERY },
  });
  const items = query.data?.items ?? [];

  return (
    <List
      dataSource={items}
      loading={query.isLoading}
      locale={{ emptyText: <Empty description={t`Aucune application`} /> }}
      renderItem={(application) => (
        <ActivityRow
          date={application.date}
          locked={application.locked}
          lockedBy={application.lockedBy}
          lockedDate={application.lockedDate}
          owner={application.owner}
          params={{ accountId, applicationId: application.id }}
          tag={<ApplicationStatusTag status={application.status} />}
          title={application.title}
          to="/accounts/$accountId/applications/$applicationId"
        />
      )}
      size="small"
    />
  );
}

function RecentDatabases({ accountId }: { accountId: string }) {
  const { t } = useLingui();
  const query = $api.useQuery("get", "/v1/accounts/{account_id}/databases", {
    params: { path: { account_id: accountId }, query: RECENT_QUERY },
  });
  const items = query.data?.items ?? [];

  return (
    <List
      dataSource={items}
      loading={query.isLoading}
      locale={{ emptyText: <Empty description={t`Aucune base de données`} /> }}
      renderItem={(database) => (
        <ActivityRow
          date={database.date}
          locked={database.locked}
          lockedBy={database.lockedBy}
          lockedDate={database.lockedDate}
          owner={database.owner}
          params={{ accountId, databaseId: database.id }}
          tag={<DatabaseStatusTag status={database.status} />}
          title={database.title}
          to="/accounts/$accountId/databases/$databaseId"
        />
      )}
      size="small"
    />
  );
}

function RecentServices({ accountId }: { accountId: string }) {
  const { t } = useLingui();
  const query = $api.useQuery("get", "/v1/accounts/{account_id}/services", {
    params: { path: { account_id: accountId }, query: RECENT_QUERY },
  });
  const items = query.data?.items ?? [];

  return (
    <List
      dataSource={items}
      loading={query.isLoading}
      locale={{ emptyText: <Empty description={t`Aucun service`} /> }}
      renderItem={(service) => (
        <ActivityRow
          date={service.date}
          locked={service.locked}
          lockedBy={service.lockedBy}
          lockedDate={service.lockedDate}
          owner={service.owner}
          params={{ accountId, serviceId: service.id }}
          tag={<ServiceStatusTag status={service.status} />}
          title={service.title}
          to="/accounts/$accountId/services/$serviceId"
        />
      )}
      size="small"
    />
  );
}

/** The activity streams available, keyed by the tab that shows them. */
type ActivityTab =
  | "features"
  | "journeys"
  | "scenarios"
  | "applications"
  | "databases"
  | "services";

const TAB_META: Record<
  ActivityTab,
  { label: MessageDescriptor; render: (accountId: string) => ReactNode }
> = {
  features: {
    label: msg`Fonctionnalités`,
    render: (accountId) => <RecentFeatures accountId={accountId} />,
  },
  journeys: {
    label: msg`Parcours`,
    render: (accountId) => <RecentJourneys accountId={accountId} />,
  },
  scenarios: {
    label: msg`Scénarios`,
    render: (accountId) => <RecentScenarios accountId={accountId} />,
  },
  applications: {
    label: msg`Applications`,
    render: (accountId) => <RecentApplications accountId={accountId} />,
  },
  databases: {
    label: msg`Bases de données`,
    render: (accountId) => <RecentDatabases accountId={accountId} />,
  },
  services: {
    label: msg`Services`,
    render: (accountId) => <RecentServices accountId={accountId} />,
  },
};

/** Which streams each viewpoint surfaces — kept where they belong: the produit
 * artefacts under Produit, the technique ones under Technique, and a broad mix
 * on the overview. */
const TAB_GROUPS: Record<Typology, [ActivityTab, ...ActivityTab[]]> = {
  overview: ["features", "journeys", "applications", "databases"],
  produit: ["features", "journeys", "scenarios"],
  technique: ["applications", "databases", "services"],
};

/** The "Activités" panel: the newest entities for the active viewpoint. The kind
 * is picked with a Segmented above the card frame, each stream a compact one-line
 * feed. */
export function ActivityFeed({
  accountId,
  typology,
}: {
  accountId: string;
  typology: Typology;
}) {
  const { t } = useLingui();
  const tabs = TAB_GROUPS[typology];
  const [active, setActive] = useState<ActivityTab>(tabs[0]);
  // Fall back to the first stream when the viewpoint drops the active one.
  const current = tabs.includes(active) ? active : tabs[0];

  return (
    <Flex gap={12} vertical>
      <Typography.Title level={5} style={{ margin: 0 }}>
        {t`Activités`}
      </Typography.Title>
      <Segmented<ActivityTab>
        onChange={setActive}
        options={tabs.map((tab) => ({
          value: tab,
          label: t(TAB_META[tab].label),
        }))}
        size="small"
        value={current}
      />
      <Card size="small">{TAB_META[current].render(accountId)}</Card>
    </Flex>
  );
}
