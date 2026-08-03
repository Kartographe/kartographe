// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import {
  ApartmentOutlined,
  BlockOutlined,
  BranchesOutlined,
  CloudServerOutlined,
  CommentOutlined,
  InfoCircleOutlined,
  LikeOutlined,
  PartitionOutlined,
  RocketOutlined,
  SafetyOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
}

function NavLink({
  item,
  accountId,
  applicationId,
  pathname,
}: {
  item: NavItem;
  accountId: string;
  applicationId: string;
  pathname: string;
}) {
  const resolved = item.to
    .replace("$accountId", accountId)
    .replace("$applicationId", applicationId);
  const active = item.exact
    ? pathname === resolved
    : pathname === resolved || pathname.startsWith(`${resolved}/`);
  return (
    <Link
      params={{ accountId, applicationId }}
      style={{
        alignItems: "center",
        background: active ? "var(--ant-color-primary-bg)" : "transparent",
        borderRadius: 8,
        color: active ? "var(--ant-color-primary)" : "var(--ant-color-text)",
        display: "flex",
        fontWeight: active ? 600 : 400,
        gap: 10,
        padding: "8px 12px",
      }}
      to={item.to}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}

const BASE = "/accounts/$accountId/applications/$applicationId";

export function ApplicationSideNav({
  accountId,
  applicationId,
}: {
  accountId: string;
  applicationId: string;
}) {
  const { t } = useLingui();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const items: NavItem[] = [
    {
      to: BASE,
      label: t`Vue d'ensemble`,
      icon: <InfoCircleOutlined />,
      exact: true,
    },
    {
      to: `${BASE}/environments`,
      label: t`Environnements`,
      icon: <CloudServerOutlined />,
    },
    {
      to: `${BASE}/deployments`,
      label: t`Déploiements`,
      icon: <RocketOutlined />,
    },
    { to: `${BASE}/guards`, label: t`Guards`, icon: <SafetyOutlined /> },
    { to: `${BASE}/roles`, label: t`Rôles`, icon: <TeamOutlined /> },
    { to: `${BASE}/versions`, label: t`Versions`, icon: <BranchesOutlined /> },
    { to: `${BASE}/routes`, label: t`Routes`, icon: <ApartmentOutlined /> },
    {
      to: `${BASE}/components`,
      label: t`Composants`,
      icon: <BlockOutlined />,
    },
    {
      to: `${BASE}/bounded-contexts`,
      label: t`Contextes bornés`,
      icon: <PartitionOutlined />,
    },
    {
      to: `${BASE}/comments`,
      label: t`Commentaires`,
      icon: <CommentOutlined />,
    },
    { to: `${BASE}/votes`, label: t`Votes`, icon: <LikeOutlined /> },
  ];

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
      {items.map((item) => (
        <NavLink
          accountId={accountId}
          applicationId={applicationId}
          item={item}
          key={item.to}
          pathname={pathname}
        />
      ))}
    </nav>
  );
}
