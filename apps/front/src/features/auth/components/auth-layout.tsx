import { DesktopOutlined, MoonOutlined, SunOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { Outlet } from "@tanstack/react-router";
import { Flex, Segmented, Typography } from "antd";
import { Logo } from "@/components/logo";
import { type ThemeMode, useThemeStore } from "@/lib/theme/theme-store";

/**
 * Split-screen shell for `/auth/*`: a branded gradient panel on the left
 * (hidden on small screens) and the centered auth card on the right.
 */
export function AuthLayout() {
  const { t } = useLingui();
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);

  return (
    <div className="flex min-h-[100dvh] w-full">
      <aside
        className="relative hidden flex-1 flex-col justify-between overflow-hidden p-12 text-white lg:flex"
        style={{
          background:
            "linear-gradient(135deg, #001529 0%, #1677ff 65%, #13c2c2 100%)",
        }}
      >
        <Flex align="center" gap={12}>
          <Logo size={40} />
          <Typography.Title level={3} style={{ color: "#fff", margin: 0 }}>
            Kartographe
          </Typography.Title>
        </Flex>
        <div className="max-w-md">
          <Typography.Title level={2} style={{ color: "#fff" }}>
            {t`Gardez le contrôle.`}
          </Typography.Title>
          <Typography.Paragraph style={{ color: "rgba(255,255,255,0.85)" }}>
            {t`Kartographe est auto-hébergé : vos données, votre infrastructure, vos règles. Sans dépendance à un tiers.`}
          </Typography.Paragraph>
        </div>
        <span
          aria-hidden
          className="pointer-events-none absolute rounded-full"
          style={{
            width: 360,
            height: 360,
            right: -120,
            bottom: -120,
            background: "rgba(255,255,255,0.08)",
          }}
        />
      </aside>

      <main
        className="flex flex-1 flex-col items-center justify-center gap-6 p-6"
        style={{ background: "var(--ant-color-bg-layout)" }}
      >
        <div className="w-full max-w-md">
          <Outlet />
        </div>
        <Segmented<ThemeMode>
          aria-label={t`Thème`}
          onChange={setMode}
          options={[
            { value: "light", icon: <SunOutlined />, title: t`Clair` },
            { value: "dark", icon: <MoonOutlined />, title: t`Sombre` },
            { value: "auto", icon: <DesktopOutlined />, title: t`Auto` },
          ]}
          value={mode}
        />
      </main>
    </div>
  );
}
