// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import {
  ApartmentOutlined,
  BulbOutlined,
  CalculatorOutlined,
  CommentOutlined,
  InfoCircleOutlined,
  LikeOutlined,
} from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { Link, useRouterState } from "@tanstack/react-router";
import { Flex, Tag, Typography } from "antd";
import type { ReactNode } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import {
  SCENARIO_STATUS_COLORS,
  SCENARIO_STATUS_LABELS,
} from "@/features/journeys/labels";

type JourneyScenario = components["schemas"]["JourneyScenarioItem"];

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
}

function linkStyle(active: boolean) {
  return {
    alignItems: "center",
    background: active ? "var(--ant-color-primary-bg)" : "transparent",
    borderRadius: 8,
    color: active ? "var(--ant-color-primary)" : "var(--ant-color-text)",
    display: "flex",
    fontWeight: active ? 600 : 400,
    gap: 10,
    padding: "8px 12px",
  } as const;
}

function NavLink({
  item,
  accountId,
  journeyId,
  pathname,
}: {
  item: NavItem;
  accountId: string;
  journeyId: string;
  pathname: string;
}) {
  const resolved = item.to
    .replace("$accountId", accountId)
    .replace("$journeyId", journeyId);
  const active = item.exact
    ? pathname === resolved
    : pathname === resolved || pathname.startsWith(`${resolved}/`);
  return (
    <Link
      params={{ accountId, journeyId }}
      style={linkStyle(active)}
      to={item.to}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}

/**
 * A scenario, reachable in one click. The status is a plain `Tag` rather than
 * the usual `EnumTag`: its description popover is a button, and a button nested
 * inside a link is not something to hand a keyboard user.
 */
function ScenarioLink({
  scenario,
  accountId,
  journeyId,
  pathname,
}: {
  scenario: JourneyScenario;
  accountId: string;
  journeyId: string;
  pathname: string;
}) {
  const { t } = useLingui();
  const resolved = `/accounts/${accountId}/journeys/${journeyId}/scenarios/${scenario.id}`;
  const active = pathname === resolved || pathname.startsWith(`${resolved}/`);

  return (
    <Link
      params={{ accountId, journeyId, scenarioId: scenario.id }}
      style={{
        ...linkStyle(active),
        fontSize: 12,
        justifyContent: "space-between",
        paddingBlock: 6,
        paddingInlineStart: 32,
      }}
      title={scenario.title}
      to="/accounts/$accountId/journeys/$journeyId/scenarios/$scenarioId"
    >
      <Typography.Text
        ellipsis
        style={{ color: "inherit", fontSize: 12, fontWeight: "inherit" }}
      >
        {scenario.title}
      </Typography.Text>
      <Tag
        color={SCENARIO_STATUS_COLORS[scenario.status]}
        style={{ fontSize: 10, lineHeight: "16px", marginInlineEnd: 0 }}
      >
        {t(SCENARIO_STATUS_LABELS[scenario.status])}
      </Tag>
    </Link>
  );
}

const BASE = "/accounts/$accountId/journeys/$journeyId";

export function JourneySideNav({
  accountId,
  journeyId,
}: {
  accountId: string;
  journeyId: string;
}) {
  const { t } = useLingui();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const scenariosQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios",
    { params: { path: { account_id: accountId, journey_id: journeyId } } }
  );
  const scenarios = scenariosQuery.data?.items ?? [];

  const overview: NavItem = {
    to: BASE,
    label: t`Informations`,
    icon: <InfoCircleOutlined />,
    exact: true,
  };
  // `exact`: the section itself, not the scenarios listed under it — each of
  // those lights up on its own.
  const scenariosItem: NavItem = {
    to: `${BASE}/scenarios`,
    label: t`Scénarios`,
    icon: <ApartmentOutlined />,
    exact: true,
  };
  const featuresItem: NavItem = {
    to: `${BASE}/features`,
    label: t`Fonctionnalités`,
    icon: <BulbOutlined />,
  };
  const comments: NavItem = {
    to: `${BASE}/comments`,
    label: t`Commentaires`,
    icon: <CommentOutlined />,
  };
  const votes: NavItem = {
    to: `${BASE}/votes`,
    label: t`Votes`,
    icon: <LikeOutlined />,
  };
  const complexity: NavItem = {
    to: `${BASE}/complexity`,
    label: t`Complexité`,
    icon: <CalculatorOutlined />,
  };

  return (
    <nav
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        height: "100%",
        padding: 8,
      }}
    >
      {[overview, scenariosItem].map((item) => (
        <NavLink
          accountId={accountId}
          item={item}
          journeyId={journeyId}
          key={item.to}
          pathname={pathname}
        />
      ))}

      {scenarios.length > 0 ? (
        <Flex gap={2} vertical>
          {scenarios.map((scenario) => (
            <ScenarioLink
              accountId={accountId}
              journeyId={journeyId}
              key={scenario.id}
              pathname={pathname}
              scenario={scenario}
            />
          ))}
        </Flex>
      ) : null}

      <NavLink
        accountId={accountId}
        item={featuresItem}
        journeyId={journeyId}
        pathname={pathname}
      />
      <NavLink
        accountId={accountId}
        item={comments}
        journeyId={journeyId}
        pathname={pathname}
      />
      <NavLink
        accountId={accountId}
        item={votes}
        journeyId={journeyId}
        pathname={pathname}
      />
      <NavLink
        accountId={accountId}
        item={complexity}
        journeyId={journeyId}
        pathname={pathname}
      />
    </nav>
  );
}
