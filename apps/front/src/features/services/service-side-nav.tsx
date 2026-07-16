// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import {
  CommentOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
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
  serviceId,
  pathname,
}: {
  item: NavItem;
  accountId: string;
  serviceId: string;
  pathname: string;
}) {
  const resolved = item.to
    .replace("$accountId", accountId)
    .replace("$serviceId", serviceId);
  const active = item.exact
    ? pathname === resolved
    : pathname === resolved || pathname.startsWith(`${resolved}/`);
  return (
    <Link
      params={{ accountId, serviceId }}
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

const BASE = "/accounts/$accountId/services/$serviceId";

export function ServiceSideNav({
  accountId,
  serviceId,
}: {
  accountId: string;
  serviceId: string;
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
    { to: `${BASE}/actions`, label: t`Actions`, icon: <ThunderboltOutlined /> },
    {
      to: `${BASE}/comments`,
      label: t`Commentaires`,
      icon: <CommentOutlined />,
    },
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
          item={item}
          key={item.to}
          pathname={pathname}
          serviceId={serviceId}
        />
      ))}
    </nav>
  );
}
