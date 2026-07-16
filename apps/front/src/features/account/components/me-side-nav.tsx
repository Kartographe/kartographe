// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import {
  ApiOutlined,
  HistoryOutlined,
  MailOutlined,
  SafetyOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

type MeRoute =
  | "/me"
  | "/me/settings"
  | "/me/security"
  | "/me/integrations"
  | "/me/accounts"
  | "/me/invitations"
  | "/me/logs";

interface NavItem {
  to: MeRoute;
  label: string;
  icon: ReactNode;
  exact?: boolean;
}

function isActive(item: NavItem, pathname: string): boolean {
  if (item.exact) {
    return pathname === item.to;
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(item, pathname);
  return (
    <Link
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

export function MeSideNav() {
  const { t } = useLingui();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const topItems: NavItem[] = [
    { to: "/me", label: t`Informations`, icon: <UserOutlined />, exact: true },
    { to: "/me/settings", label: t`Préférences`, icon: <SettingOutlined /> },
    { to: "/me/security", label: t`Sécurité`, icon: <SafetyOutlined /> },
    { to: "/me/accounts", label: t`Comptes`, icon: <TeamOutlined /> },
    { to: "/me/invitations", label: t`Invitations`, icon: <MailOutlined /> },
    { to: "/me/integrations", label: t`Intégrations`, icon: <ApiOutlined /> },
  ];
  const footerItems: NavItem[] = [
    { to: "/me/logs", label: t`Activité`, icon: <HistoryOutlined /> },
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
      {topItems.map((item) => (
        <NavLink item={item} key={item.to} pathname={pathname} />
      ))}
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {footerItems.map((item) => (
          <NavLink item={item} key={item.to} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}
