// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useNavigate } from "@tanstack/react-router";
import type { components } from "@/api/generated/schema";
import { useIntermediateStore } from "@/features/auth/stores/intermediate-store";
import { consumePostLoginReturn } from "@/lib/auth/post-login-return";
import { saveSession } from "@/lib/auth/token-storage";

type TokenItem = components["schemas"]["TokenItem"];

/** Finish a second-factor step: persist the session, clear the challenge, go home. */
export function useTwoFactorComplete() {
  const navigate = useNavigate();
  const clear = useIntermediateStore((state) => state.clear);
  return (item: TokenItem) => {
    saveSession(item, false);
    clear();
    const back = consumePostLoginReturn();
    if (back) {
      window.location.assign(back);
      return;
    }
    navigate({ to: "/" });
  };
}
