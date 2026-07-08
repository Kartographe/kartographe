import {
  LogoutOutlined,
  SafetyOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { Link, Outlet } from "@tanstack/react-router";
import { Avatar, Dropdown, Flex, Layout, Typography } from "antd";
import { useCurrentUser } from "@/features/account/hooks/use-current-user";
import { emitSessionExpired } from "@/lib/auth/auth-events";
import { clearSession } from "@/lib/auth/token-storage";

export function AppShell() {
  const { t } = useLingui();
  const meQuery = useCurrentUser();
  const me = meQuery.data?.item;

  const displayName =
    [me?.firstName, me?.lastName].filter(Boolean).join(" ") || me?.email || "";

  function logout() {
    clearSession();
    emitSessionExpired("manual");
  }

  return (
    <Layout style={{ minHeight: "100dvh" }}>
      <Layout.Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--ant-color-bg-container)",
          borderBottom: "1px solid var(--ant-color-border-secondary)",
          paddingInline: 24,
        }}
      >
        <Flex align="center" gap={24}>
          <Link style={{ fontSize: 18, fontWeight: 700 }} to="/">
            Kartographe
          </Link>
        </Flex>
        <Dropdown
          menu={{
            items: [
              {
                key: "profile",
                icon: <UserOutlined />,
                label: <Link to="/account">{t`Mon profil`}</Link>,
              },
              {
                key: "security",
                icon: <SafetyOutlined />,
                label: <Link to="/account/security">{t`Sécurité`}</Link>,
              },
              { type: "divider" },
              {
                key: "logout",
                icon: <LogoutOutlined />,
                label: t`Se déconnecter`,
                onClick: logout,
              },
            ],
          }}
        >
          <Flex align="center" gap={8} style={{ cursor: "pointer" }}>
            <Avatar icon={<UserOutlined />} src={me?.pictureProfile} />
            <Typography.Text>{displayName}</Typography.Text>
          </Flex>
        </Dropdown>
      </Layout.Header>
      <Layout.Content style={{ padding: 24 }}>
        <div style={{ margin: "0 auto", maxWidth: 900 }}>
          <Outlet />
        </div>
      </Layout.Content>
    </Layout>
  );
}
