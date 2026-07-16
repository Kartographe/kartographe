// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { RecoveryScreen } from "@/features/auth/screens/recovery-screen";

export const Route = createFileRoute("/auth/recovery")({
  component: RecoveryScreen,
});
