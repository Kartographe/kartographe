import { useNavigate } from "@tanstack/react-router";
import type { components } from "@/api/generated/schema";
import { useIntermediateStore } from "@/features/auth/stores/intermediate-store";
import { consumePostLoginReturn } from "@/lib/auth/post-login-return";
import { saveSession } from "@/lib/auth/token-storage";

type AuthResponse = components["schemas"]["AuthResponse"];

/**
 * Shared "what to do with a login/SSO result": either complete the session and
 * land on the app, or stash the 2FA challenge and route to the second-factor
 * step.
 */
export function useAuthSuccess() {
  const navigate = useNavigate();
  const setChallenge = useIntermediateStore((state) => state.setChallenge);

  return (data: AuthResponse, remember: boolean) => {
    if (data.twoFactorEnabled) {
      const types = data.twoFactorAvailableTypes ?? [];
      setChallenge(data.item.accessToken, types);
      // Prefer the lowest-friction factor; fall back to the chooser.
      let target: "/auth/u2f" | "/auth/otp" | "/auth/2fa" = "/auth/2fa";
      if (types.includes("u2f")) {
        target = "/auth/u2f";
      } else if (types.includes("otp")) {
        target = "/auth/otp";
      }
      navigate({ to: target });
      return;
    }
    saveSession(data.item, remember);
    const back = consumePostLoginReturn();
    if (back) {
      window.location.assign(back);
      return;
    }
    navigate({ to: "/" });
  };
}
