// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import {
  AppstoreOutlined,
  BulbOutlined,
  CloudServerOutlined,
  ControlOutlined,
  DatabaseOutlined,
  HomeOutlined,
  NodeIndexOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { Link, useRouterState } from "@tanstack/react-router";
import { Divider, Tooltip, Typography } from "antd";
import type { ReactNode } from "react";
import { $api } from "@/api/$api";
import { useCurrentAccountId } from "@/features/accounts/use-current-account-id";

interface NavItem {
  to: string;
  params?: Record<string, string>;
  label: string;
  icon: ReactNode;
  exact?: boolean;
}

/** A group of links under a heading. A section without a title stands alone. */
interface NavSection {
  key: string;
  title?: string;
  items: NavItem[];
}

function isActive(item: NavItem, resolved: string, pathname: string): boolean {
  if (item.exact) {
    return pathname === resolved;
  }
  return pathname === resolved || pathname.startsWith(`${resolved}/`);
}

function NavLink({
  item,
  pathname,
  collapsed,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
}) {
  const resolved = item.params
    ? Object.entries(item.params).reduce(
        (path, [key, value]) => path.replace(`$${key}`, value),
        item.to
      )
    : item.to;
  const active = isActive(item, resolved, pathname);
  const link = (
    <Link
      params={item.params}
      style={{
        alignItems: "center",
        background: active ? "var(--ant-color-primary-bg)" : "transparent",
        borderRadius: 8,
        color: active ? "var(--ant-color-primary)" : "var(--ant-color-text)",
        display: "flex",
        fontWeight: active ? 600 : 400,
        gap: 10,
        justifyContent: collapsed ? "center" : "flex-start",
        padding: "8px 12px",
      }}
      to={item.to}
    >
      {item.icon}
      {collapsed ? null : item.label}
    </Link>
  );
  return collapsed ? (
    <Tooltip placement="right" title={item.label}>
      {link}
    </Tooltip>
  ) : (
    link
  );
}

export function NavMenu({ collapsed }: { collapsed: boolean }) {
  const { t } = useLingui();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const accountId = useCurrentAccountId();

  const accountQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}",
    { params: { path: { account_id: accountId ?? "" } } },
    { enabled: !!accountId }
  );
  const role = accountQuery.data?.item.membership?.role;
  const isAdmin = role === "owner" || role === "administrator";

  // Outside an account (e.g. `/`, `/me/*`) → empty nav; the switcher and the
  // bottom user section are the only things the shell offers.
  if (!accountId) {
    return <nav style={{ height: "100%" }} />;
  }

  const params = { accountId };
  const sections: NavSection[] = [
    {
      key: "dashboard",
      items: [
        {
          to: "/accounts/$accountId",
          params,
          label: t`Tableau de bord`,
          icon: <HomeOutlined />,
          exact: true,
        },
      ],
    },
    {
      key: "product",
      title: t`Produit`,
      items: [
        {
          to: "/accounts/$accountId/features",
          params,
          label: t`Fonctionnalités`,
          icon: <BulbOutlined />,
        },
        {
          to: "/accounts/$accountId/journeys",
          params,
          label: t`Parcours utilisateurs`,
          icon: <NodeIndexOutlined />,
        },
        {
          to: "/accounts/$accountId/personas",
          params,
          label: t`Personas`,
          icon: <TeamOutlined />,
        },
      ],
    },
    {
      key: "infrastructure",
      title: t`Infrastructure`,
      items: [
        {
          to: "/accounts/$accountId/databases",
          params,
          label: t`Bases de données`,
          icon: <DatabaseOutlined />,
        },
        {
          to: "/accounts/$accountId/applications",
          params,
          label: t`Applications`,
          icon: <AppstoreOutlined />,
        },
        {
          to: "/accounts/$accountId/services",
          params,
          label: t`Services`,
          icon: <CloudServerOutlined />,
        },
      ],
    },
  ];

  const bottomItems: NavItem[] = isAdmin
    ? [
        {
          to: "/accounts/$accountId/administration",
          params: { accountId },
          label: t`Administration`,
          icon: <ControlOutlined />,
        },
      ]
    : [];

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
      {sections.map((section) => (
        <div
          key={section.key}
          style={{ display: "flex", flexDirection: "column", gap: 4 }}
        >
          {/* Collapsed, a heading has no room — a rule keeps the grouping. */}
          {section.title && collapsed ? (
            <Divider style={{ margin: "4px 0" }} />
          ) : null}
          {section.title && !collapsed ? (
            <Typography.Text
              style={{
                fontSize: 11,
                letterSpacing: 0.4,
                marginTop: 8,
                padding: "0 12px",
                textTransform: "uppercase",
              }}
              type="secondary"
            >
              {section.title}
            </Typography.Text>
          ) : null}
          {section.items.map((item) => (
            <NavLink
              collapsed={collapsed}
              item={item}
              key={item.to}
              pathname={pathname}
            />
          ))}
        </div>
      ))}

      {bottomItems.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            marginTop: "auto",
          }}
        >
          {bottomItems.map((item) => (
            <NavLink
              collapsed={collapsed}
              item={item}
              key={item.to}
              pathname={pathname}
            />
          ))}
        </div>
      ) : null}
    </nav>
  );
}
