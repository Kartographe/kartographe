// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useEffect, useRef } from "react";
import { env } from "@/lib/env/env";
import { resolveIsDark, useThemeStore } from "@/lib/theme/theme-store";

interface TurnstileApi {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      theme?: "light" | "dark";
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    }
  ) => string;
  remove: (id: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("turnstile")));
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("turnstile")));
    document.head.appendChild(script);
  });
}

interface TurnstileWidgetProps {
  onToken: (token: string | null) => void;
}

/**
 * Renders the Cloudflare Turnstile widget and reports its token upward. When no
 * site key is configured it renders nothing and immediately reports `null`, so
 * forms that treat "configured ⇒ token required" don't block in local dev.
 */
export function TurnstileWidget({ onToken }: TurnstileWidgetProps) {
  const siteKey = env.VITE_TURNSTILE_SITE_KEY;
  const isDark = useThemeStore((state) =>
    resolveIsDark(
      state.mode,
      typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
    )
  );
  const containerRef = useRef<HTMLDivElement>(null);
  // Keep the latest callback without re-rendering the widget.
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!siteKey) {
      onTokenRef.current(null);
      return;
    }
    let widgetId: string | null = null;
    let cancelled = false;
    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) {
          return;
        }
        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: isDark ? "dark" : "light",
          callback: (token) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        });
      })
      .catch(() => onTokenRef.current(null));
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
      }
    };
  }, [isDark]);

  if (!siteKey) {
    return null;
  }
  return <div className="flex justify-center" ref={containerRef} />;
}
