import {
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Button, Divider, Drawer, Flex, Grid, Layout } from "antd";
import { useEffect, useState } from "react";
import { useAppShellStore } from "@/components/app-shell/app-shell-store";
import { NavMenu } from "@/components/app-shell/nav-menu";
import { UserMenu } from "@/components/app-shell/user-menu";
import { Logo } from "@/components/logo";
import { LogoHorizontal } from "@/components/logo-horizontal";
import { AccountSwitcher } from "@/features/accounts/account-switcher";

function SidebarInner({
  collapsed,
  showToggle,
}: {
  collapsed: boolean;
  showToggle: boolean;
}) {
  const toggle = useAppShellStore((state) => state.toggleCollapsed);
  return (
    <Flex style={{ height: "100%" }} vertical>
      <Link to="/">
        <Flex
          align="center"
          justify={collapsed ? "center" : "flex-start"}
          style={{ height: 56, paddingInline: 16 }}
        >
          {collapsed ? <Logo size={30} /> : <LogoHorizontal height={26} />}
        </Flex>
      </Link>
      <Divider style={{ margin: 0 }} />

      <AccountSwitcher collapsed={collapsed} />
      <Divider style={{ margin: 0 }} />

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <NavMenu collapsed={collapsed} />
      </div>

      <Divider style={{ margin: 0 }} />
      <Flex gap={4} style={{ padding: 8 }} vertical>
        {showToggle ? (
          <Button
            aria-label="toggle-sidebar"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={toggle}
            style={{ alignSelf: collapsed ? "center" : "flex-start" }}
            type="text"
          />
        ) : null}
        <UserMenu collapsed={collapsed} />
      </Flex>
    </Flex>
  );
}

export function AppShell() {
  const collapsed = useAppShellStore((state) => state.collapsed);
  const screens = Grid.useBreakpoint();
  const isDesktop = screens.lg ?? false;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  // Close the mobile drawer whenever the route changes. `pathname` is the
  // intentional trigger even though the body doesn't read it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the navigation trigger
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const content = (
    <Layout.Content
      className="p-4 lg:p-8"
      style={{
        background: "var(--ant-color-bg-layout)",
        height: "100%",
        overflowY: "auto",
      }}
    >
      <Outlet />
    </Layout.Content>
  );

  if (isDesktop) {
    return (
      <Layout hasSider style={{ height: "100dvh" }}>
        <Layout.Sider
          collapsed={collapsed}
          collapsedWidth={72}
          style={{
            background: "var(--ant-color-bg-container)",
            borderInlineEnd: "1px solid var(--ant-color-border-secondary)",
          }}
          trigger={null}
          width={256}
        >
          <div style={{ height: "100dvh" }}>
            <SidebarInner collapsed={collapsed} showToggle />
          </div>
        </Layout.Sider>
        <Layout style={{ height: "100dvh" }}>{content}</Layout>
      </Layout>
    );
  }

  return (
    <Layout style={{ height: "100dvh" }}>
      <Layout.Header
        style={{
          alignItems: "center",
          background: "var(--ant-color-bg-container)",
          borderBottom: "1px solid var(--ant-color-border-secondary)",
          display: "flex",
          gap: 12,
          paddingInline: 16,
        }}
      >
        <Button
          aria-label="open-menu"
          icon={<MenuOutlined />}
          onClick={() => setDrawerOpen(true)}
          type="text"
        />
        <LogoHorizontal height={24} />
      </Layout.Header>
      {content}
      <Drawer
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        placement="left"
        styles={{ body: { padding: 0 } }}
        width={272}
      >
        <SidebarInner collapsed={false} showToggle={false} />
      </Drawer>
    </Layout>
  );
}
