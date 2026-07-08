import { SafetyOutlined, UserOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

interface NavItem {
  to: "/account" | "/account/security";
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

export function AccountSideNav() {
  const { t } = useLingui();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const items: NavItem[] = [
    { to: "/account", label: t`Profil`, icon: <UserOutlined />, exact: true },
    { to: "/account/security", label: t`Sécurité`, icon: <SafetyOutlined /> },
  ];

  return (
    <nav
      style={{ display: "flex", flexDirection: "column", gap: 4, padding: 8 }}
    >
      {items.map((item) => {
        const active = isActive(item, pathname);
        return (
          <Link
            key={item.to}
            style={{
              alignItems: "center",
              background: active
                ? "var(--ant-color-primary-bg)"
                : "transparent",
              borderRadius: 8,
              color: active
                ? "var(--ant-color-primary)"
                : "var(--ant-color-text)",
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
      })}
    </nav>
  );
}
