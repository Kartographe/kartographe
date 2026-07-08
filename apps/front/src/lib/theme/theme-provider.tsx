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

  // Kartographe palette (from the logo): navy base + blue primary + teal accent.
  // Dark surfaces are navy-tinted with clear steps so blocks stand out from the
  // page; light gets a faint blue-grey page so white cards read as blocks.
  const darkTokens = {
    colorBgBase: "#0A1929",
    colorBgLayout: "#0A1929",
    colorBgContainer: "#122942",
    colorBgElevated: "#173A5E",
    colorBorder: "#2A4C6E",
    colorBorderSecondary: "#1C3A57",
    colorText: "rgba(255, 255, 255, 0.92)",
    colorTextSecondary: "rgba(255, 255, 255, 0.65)",
    colorTextTertiary: "rgba(255, 255, 255, 0.45)",
  };
  const lightTokens = {
    colorBgLayout: "#eef2f7",
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
            colorPrimary: "#1677ff",
            colorLink: "#1677ff",
            ...(isDark ? darkTokens : lightTokens),
          },
          components: {
            Avatar: {
              colorTextPlaceholder: "#1677ff",
            },
            Menu: {
              itemSelectedBg: "#1677ff",
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
