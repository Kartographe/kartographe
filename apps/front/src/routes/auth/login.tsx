// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { LoginScreen } from "@/features/auth/screens/login-screen";

export const Route = createFileRoute("/auth/login")({
  component: LoginScreen,
});
