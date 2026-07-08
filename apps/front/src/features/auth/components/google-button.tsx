import { useEffect, useRef } from "react";
import { $api } from "@/api/$api";
import { extractApiErrorDetail } from "@/api/error-messages";
import { useAuthSuccess } from "@/features/auth/hooks/use-auth-success";
import { env } from "@/lib/env/env";

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential: string }) => void;
  }) => void;
  renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const GSI_SRC = "https://accounts.google.com/gsi/client";

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GSI_SRC}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("gsi")));
      return;
    }
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("gsi")));
    document.head.appendChild(script);
  });
}

interface GoogleButtonProps {
  onError: (message: string) => void;
}

/**
 * "Sign in with Google" — rendered only when `VITE_GOOGLE_CLIENT_ID` is set.
 * Exchanges the Google ID token for a Kartographe session via `/auth/sso/google`.
 */
export function GoogleButton({ onError }: GoogleButtonProps) {
  const clientId = env.VITE_GOOGLE_CLIENT_ID;
  const containerRef = useRef<HTMLDivElement>(null);
  const onAuthSuccess = useAuthSuccess();
  const ssoMutation = $api.useMutation("post", "/auth/sso/google", {
    meta: { noErrorToast: true },
  });

  const handleCredentialRef = useRef<(credential: string) => void>(() => {
    // replaced below
  });
  handleCredentialRef.current = async (credential: string) => {
    try {
      const data = await ssoMutation.mutateAsync({
        body: { googleToken: credential },
      });
      onAuthSuccess(data, false);
    } catch (error) {
      onError(extractApiErrorDetail(error));
    }
  };

  useEffect(() => {
    if (!clientId) {
      return;
    }
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !(containerRef.current && window.google)) {
          return;
        }
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) =>
            handleCredentialRef.current(response.credential),
        });
        // Match the block submit button's width (GIS caps the button at 400px).
        const width = Math.max(
          200,
          Math.min(400, Math.floor(containerRef.current.offsetWidth))
        );
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          width,
          text: "signin_with",
          logo_alignment: "center",
        });
      })
      .catch(() => {
        // Google script blocked — silently hide the button.
      });
    return () => {
      cancelled = true;
    };
    // clientId comes from build-time env — stable for the app's lifetime.
  }, []);

  if (!clientId) {
    return null;
  }
  return <div className="flex justify-center" ref={containerRef} />;
}
