import { AppstoreOutlined, ControlOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { Link, useRouterState } from "@tanstack/react-router";
import { Tooltip } from "antd";
import type { ReactNode } from "react";
import { $api } from "@/api/$api";
import { useActiveAccountStore } from "@/features/accounts/active-account-store";

interface NavItem {
  to: string;
  params?: Record<string, string>;
  label: string;
  icon: ReactNode;
  exact?: boolean;
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
  const activeId = useActiveAccountStore((state) => state.accountId);

  const accountQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}",
    { params: { path: { account_id: activeId ?? "" } } },
    { enabled: !!activeId }
  );
  const role = accountQuery.data?.item.membership?.role;
  const isAdmin = role === "owner" || role === "administrator";

  // No account selected → empty nav (only the bottom user section shows).
  if (!activeId) {
    return <nav style={{ height: "100%" }} />;
  }

  const topItems: NavItem[] = [
    {
      to: "/accounts/$accountId/applications",
      params: { accountId: activeId },
      label: t`Applications`,
      icon: <AppstoreOutlined />,
    },
  ];

  const bottomItems: NavItem[] = isAdmin
    ? [
        {
          to: "/accounts/$accountId/administration",
          params: { accountId: activeId },
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
      {topItems.map((item) => (
        <NavLink
          collapsed={collapsed}
          item={item}
          key={item.to}
          pathname={pathname}
        />
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
