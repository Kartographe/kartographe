import {
  InfoCircleOutlined,
  MailOutlined,
  TeamOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

function NavLink({
  item,
  accountId,
  pathname,
}: {
  item: NavItem;
  accountId: string;
  pathname: string;
}) {
  const resolved = item.to.replace("$accountId", accountId);
  const active = pathname === resolved || pathname.startsWith(`${resolved}/`);
  return (
    <Link
      params={{ accountId }}
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

export function AccountAdminSideNav({ accountId }: { accountId: string }) {
  const { t } = useLingui();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const topItems: NavItem[] = [
    {
      to: "/accounts/$accountId/administration/information",
      label: t`Informations`,
      icon: <InfoCircleOutlined />,
    },
    {
      to: "/accounts/$accountId/administration/members",
      label: t`Membres`,
      icon: <TeamOutlined />,
    },
    {
      to: "/accounts/$accountId/administration/invitations",
      label: t`Invitations`,
      icon: <MailOutlined />,
    },
  ];
  const footerItems: NavItem[] = [
    {
      to: "/accounts/$accountId/administration/advanced",
      label: t`Avancé`,
      icon: <WarningOutlined />,
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
      {topItems.map((item) => (
        <NavLink
          accountId={accountId}
          item={item}
          key={item.to}
          pathname={pathname}
        />
      ))}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          marginTop: "auto",
        }}
      >
        {footerItems.map((item) => (
          <NavLink
            accountId={accountId}
            item={item}
            key={item.to}
            pathname={pathname}
          />
        ))}
      </div>
    </nav>
  );
}
