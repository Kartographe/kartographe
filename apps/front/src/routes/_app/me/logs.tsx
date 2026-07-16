// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { ActivityScreen } from "@/features/account/screens/activity-screen";

export const Route = createFileRoute("/_app/me/logs")({
  component: ActivityScreen,
});
