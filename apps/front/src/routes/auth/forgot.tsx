// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { ForgotScreen } from "@/features/auth/screens/forgot-screen";

export const Route = createFileRoute("/auth/forgot")({
  component: ForgotScreen,
});
