import { StyleProvider } from "@ant-design/cssinjs";
import { App as AntdApp, theme as antdTheme, ConfigProvider } from "antd";
import frFR from "antd/locale/fr_FR";
import { type ReactNode, useEffect, useState } from "react";
import { MessageBridge } from "@/lib/antd/message-bridge";
import { resolveIsDark, useThemeStore } from "@/lib/theme/theme-store";

interface Props {
  children: ReactNode;
}

export function ThemeProvider({ children }: Props) {
  const mode = useThemeStore((s) => s.mode);
  const [prefersDark, setPrefersDark] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  const isDark = resolveIsDark(mode, prefersDark);

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, [isDark]);

  // Warm indigo-grey dark surface palette; the primary / link colour stays on
  // the brand violet in both themes.
  const darkTokens = {
    colorBgBase: "#1F2129",
    colorBgLayout: "#1F2129",
    colorBgContainer: "#272A35",
    colorBgElevated: "#31323D",
    colorBorder: "#3A3C48",
    colorBorderSecondary: "#2C2E38",
    colorText: "rgba(255, 255, 255, 0.9)",
    colorTextSecondary: "rgba(255, 255, 255, 0.62)",
    colorTextTertiary: "rgba(255, 255, 255, 0.45)",
  };

  return (
    <StyleProvider>
      <ConfigProvider
        locale={frFR}
        theme={{
          cssVar: { key: "ant" },
          hashed: false,
          algorithm: isDark
            ? antdTheme.darkAlgorithm
            : antdTheme.defaultAlgorithm,
          token: {
            colorPrimary: "#6d3ad8",
            colorLink: "#6d3ad8",
            ...(isDark ? darkTokens : {}),
          },
          components: {
            Avatar: {
              colorTextPlaceholder: "#6d3ad8",
            },
            Menu: {
              itemSelectedBg: "#6d3ad8",
              itemSelectedColor: "#ffffff",
            },
            Rate: {
              starSize: 16,
            },
            Table: {
              headerBorderRadius: 0,
            },
          },
        }}
      >
        <AntdApp>
          <MessageBridge />
          {children}
        </AntdApp>
      </ConfigProvider>
    </StyleProvider>
  );
}
