import { resolveIsDark, useThemeStore } from "@/lib/theme/theme-store";

interface LogoHorizontalProps {
  height?: number;
  /** Force the white variant (for a dark/coloured background). */
  onDark?: boolean;
}

/**
 * The horizontal Kartographe wordmark (K mark + name). Theme-aware by default —
 * the dark-ink logo on light surfaces, the white logo on dark ones — unless
 * `onDark` forces the white variant (e.g. on the auth gradient panel).
 */
export function LogoHorizontal({ height = 28, onDark }: LogoHorizontalProps) {
  const mode = useThemeStore((state) => state.mode);
  const isDark =
    onDark ??
    resolveIsDark(
      mode,
      typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  // Keep the logo's 430×90 aspect ratio.
  const width = Math.round((height * 430) / 90);
  return (
    <img
      alt="Kartographe"
      height={height}
      src={isDark ? "/logo-horizontal-white.svg" : "/logo-horizontal.svg"}
      style={{ display: "block" }}
      width={width}
    />
  );
}
