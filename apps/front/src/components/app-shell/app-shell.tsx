import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { Link, Outlet } from "@tanstack/react-router";
import { Button, Divider, Flex, Layout } from "antd";
import { useAppShellStore } from "@/components/app-shell/app-shell-store";
import { NavMenu } from "@/components/app-shell/nav-menu";
import { UserMenu } from "@/components/app-shell/user-menu";
import { Logo } from "@/components/logo";
import { LogoHorizontal } from "@/components/logo-horizontal";

export function AppShell() {
  const collapsed = useAppShellStore((state) => state.collapsed);
  const toggle = useAppShellStore((state) => state.toggleCollapsed);

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
        <Flex style={{ height: "100dvh" }} vertical>
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

          <div style={{ flex: 1, overflowY: "auto" }}>
            <NavMenu />
          </div>

          <Divider style={{ margin: 0 }} />
          <Flex gap={4} style={{ padding: 8 }} vertical>
            <Button
              aria-label="toggle-sidebar"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggle}
              type="text"
            />
            <UserMenu collapsed={collapsed} />
          </Flex>
        </Flex>
      </Layout.Sider>

      <Layout style={{ height: "100dvh" }}>
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
      </Layout>
    </Layout>
  );
}
