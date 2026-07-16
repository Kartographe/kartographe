// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { IntegrationsScreen } from "@/features/integrations/integrations-screen";

export const Route = createFileRoute("/_app/me/integrations")({
  component: IntegrationsScreen,
});
