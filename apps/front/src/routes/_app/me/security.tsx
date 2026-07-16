// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { SecurityScreen } from "@/features/account/screens/security-screen";

export const Route = createFileRoute("/_app/me/security")({
  component: SecurityScreen,
});
