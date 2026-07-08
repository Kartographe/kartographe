import {
  DesktopOutlined,
  LogoutOutlined,
  MoonOutlined,
  SafetyOutlined,
  SunOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import {
  Avatar,
  Divider,
  Flex,
  Menu,
  Popover,
  Segmented,
  Typography,
} from "antd";
import { useState } from "react";
import { useCurrentUser } from "@/features/account/hooks/use-current-user";
import { emitSessionExpired } from "@/lib/auth/auth-events";
import { clearSession } from "@/lib/auth/token-storage";
import { env } from "@/lib/env/env";
import { type ThemeMode, useThemeStore } from "@/lib/theme/theme-store";

interface UserMenuProps {
  collapsed: boolean;
}

function initials(
  firstName?: string | null,
  lastName?: string | null,
  email?: string
): string {
  const letters = [firstName, lastName]
    .filter(Boolean)
    .map((part) => part?.[0]);
  if (letters.length) {
    return letters.join("").toUpperCase();
  }
  return (email?.[0] ?? "?").toUpperCase();
}

export function UserMenu({ collapsed }: UserMenuProps) {
  const { t } = useLingui();
  const navigate = useNavigate();
  const meQuery = useCurrentUser();
  const me = meQuery.data?.item;
  const [open, setOpen] = useState(false);
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);

  const displayName =
    [me?.firstName, me?.lastName].filter(Boolean).join(" ") || me?.email || "";

  function go(to: "/me" | "/me/security") {
    navigate({ to });
    setOpen(false);
  }

  function logout() {
    setOpen(false);
    clearSession();
    emitSessionExpired("manual");
  }

  const content = (
    <div style={{ width: 240 }}>
      <Menu
        items={[
          {
            key: "account",
            icon: <UserOutlined />,
            label: t`Mon compte`,
            onClick: () => go("/me"),
          },
          {
            key: "security",
            icon: <SafetyOutlined />,
            label: t`Sécurité`,
            onClick: () => go("/me/security"),
          },
        ]}
        selectable={false}
        style={{ border: "none", background: "transparent" }}
      />
      <Divider style={{ margin: "4px 0" }} />
      <Flex
        align="center"
        justify="space-between"
        style={{ padding: "4px 12px" }}
      >
        <Typography.Text type="secondary">{t`Thème`}</Typography.Text>
        <Segmented<ThemeMode>
          onChange={setMode}
          options={[
            { value: "light", icon: <SunOutlined /> },
            { value: "dark", icon: <MoonOutlined /> },
            { value: "auto", icon: <DesktopOutlined /> },
          ]}
          size="small"
          value={mode}
        />
      </Flex>
      <Typography.Text
        style={{ display: "block", fontSize: 12, padding: "0 12px 4px" }}
        type="secondary"
      >
        v{env.VITE_APP_TAG_VERSION}
      </Typography.Text>
      <Divider style={{ margin: "4px 0" }} />
      <Menu
        items={[
          {
            key: "logout",
            icon: <LogoutOutlined />,
            label: t`Déconnexion`,
            danger: true,
            onClick: logout,
          },
        ]}
        selectable={false}
        style={{ border: "none", background: "transparent" }}
      />
    </div>
  );

  return (
    <Popover
      arrow
      content={content}
      onOpenChange={setOpen}
      open={open}
      placement="rightBottom"
      styles={{ content: { padding: 0 } }}
      trigger="click"
    >
      <Flex
        align="center"
        gap={10}
        style={{
          borderRadius: 8,
          cursor: "pointer",
          justifyContent: collapsed ? "center" : "flex-start",
          padding: 8,
        }}
      >
        <Avatar
          icon={<UserOutlined />}
          size={collapsed ? 32 : 36}
          src={me?.pictureProfile ?? undefined}
        >
          {initials(me?.firstName, me?.lastName, me?.email)}
        </Avatar>
        {collapsed ? null : (
          <Flex style={{ minWidth: 0 }} vertical>
            <Typography.Text ellipsis strong>
              {displayName}
            </Typography.Text>
            <Typography.Text ellipsis style={{ fontSize: 12 }} type="secondary">
              {me?.email}
            </Typography.Text>
          </Flex>
        )}
      </Flex>
    </Popover>
  );
}
