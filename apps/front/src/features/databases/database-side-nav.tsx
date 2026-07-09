import {
  CommentOutlined,
  InfoCircleOutlined,
  TableOutlined,
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
  databaseId,
  pathname,
}: {
  item: NavItem;
  accountId: string;
  databaseId: string;
  pathname: string;
}) {
  const resolved = item.to
    .replace("$accountId", accountId)
    .replace("$databaseId", databaseId);
  const active = item.exact
    ? pathname === resolved
    : pathname === resolved || pathname.startsWith(`${resolved}/`);
  return (
    <Link
      params={{ accountId, databaseId }}
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

const BASE = "/accounts/$accountId/databases/$databaseId";

export function DatabaseSideNav({
  accountId,
  databaseId,
}: {
  accountId: string;
  databaseId: string;
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
    { to: `${BASE}/tables`, label: t`Tables`, icon: <TableOutlined /> },
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
          databaseId={databaseId}
          item={item}
          key={item.to}
          pathname={pathname}
        />
      ))}
    </nav>
  );
}
