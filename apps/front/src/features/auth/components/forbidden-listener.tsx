// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getMessageApi } from "@/lib/antd/message-bridge";
import { onForbidden } from "@/lib/auth/forbidden-events";

/**
 * Sends the user back to the dashboard when a read is forbidden (403) — an
 * account they don't belong to, a page above their role. Mounted once at the
 * router root, next to `SessionExpiredListener`.
 */
export function ForbiddenListener() {
  const navigate = useNavigate();
  const { t } = useLingui();
  useEffect(
    () =>
      onForbidden(() => {
        // Keyed: a retried query, or several failing at once on the same page,
        // must not stack identical toasts.
        getMessageApi().error({
          content: t`Vous n'avez pas accès à cette ressource.`,
          key: "forbidden",
        });
        navigate({ to: "/" });
      }),
    [navigate, t]
  );
  return null;
}
