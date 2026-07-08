import { DashboardOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu } from "antd";
import type { ItemType } from "antd/es/menu/interface";

/**
 * Pick the menu key that best matches the current path: longest-prefix wins, and
 * the home key `/` matches only exactly (otherwise it would match everything).
 */
function activeKey(pathname: string, keys: string[]): string | undefined {
  const sorted = [...keys].sort((a, b) => b.length - a.length);
  for (const key of sorted) {
    if (key === "/") {
      if (pathname === "/") {
        return key;
      }
      continue;
    }
    if (pathname === key || pathname.startsWith(`${key}/`)) {
      return key;
    }
  }
  return undefined;
}

export function NavMenu() {
  const { t } = useLingui();
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const items: ItemType[] = [
    {
      key: "/",
      icon: <DashboardOutlined />,
      label: t`Tableau de bord`,
      onClick: () => navigate({ to: "/" }),
    },
  ];

  const keys = items
    .map((item) => (item && "key" in item ? String(item.key) : ""))
    .filter(Boolean);
  const selected = activeKey(pathname, keys);

  return (
    <Menu
      className="!border-r-0 !bg-transparent"
      items={items}
      mode="inline"
      selectedKeys={selected ? [selected] : []}
    />
  );
}
