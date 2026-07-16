// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell/app-shell";
import { requireSession } from "@/lib/auth/require-session";

export const Route = createFileRoute("/_app")({
  beforeLoad: requireSession,
  component: AppShell,
});
