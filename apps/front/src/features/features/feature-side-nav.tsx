// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import {
  CommentOutlined,
  FileOutlined,
  InfoCircleOutlined,
  LikeOutlined,
  NodeIndexOutlined,
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
  featureId,
  pathname,
}: {
  item: NavItem;
  accountId: string;
  featureId: string;
  pathname: string;
}) {
  const resolved = item.to
    .replace("$accountId", accountId)
    .replace("$featureId", featureId);
  const active = item.exact
    ? pathname === resolved
    : pathname === resolved || pathname.startsWith(`${resolved}/`);
  return (
    <Link
      params={{ accountId, featureId }}
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

const BASE = "/accounts/$accountId/features/$featureId";

export function FeatureSideNav({
  accountId,
  featureId,
}: {
  accountId: string;
  featureId: string;
}) {
  const { t } = useLingui();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const items: NavItem[] = [
    {
      to: BASE,
      label: t`Informations`,
      icon: <InfoCircleOutlined />,
      exact: true,
    },
    { to: `${BASE}/files`, label: t`Fichiers`, icon: <FileOutlined /> },
    {
      to: `${BASE}/journeys`,
      label: t`Parcours utilisateur`,
      icon: <NodeIndexOutlined />,
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
          featureId={featureId}
          item={item}
          key={item.to}
          pathname={pathname}
        />
      ))}
    </nav>
  );
}
