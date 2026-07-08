import { useNavigate } from "@tanstack/react-router";
import type { components } from "@/api/generated/schema";
import { useIntermediateStore } from "@/features/auth/stores/intermediate-store";
import { saveSession } from "@/lib/auth/token-storage";

type TokenItem = components["schemas"]["TokenItem"];

/** Finish a second-factor step: persist the session, clear the challenge, go home. */
export function useTwoFactorComplete() {
  const navigate = useNavigate();
  const clear = useIntermediateStore((state) => state.clear);
  return (item: TokenItem) => {
    saveSession(item, false);
    clear();
    navigate({ to: "/" });
  };
}
