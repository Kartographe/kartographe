// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { RegisterScreen } from "@/features/auth/screens/register-screen";

export const Route = createFileRoute("/auth/register")({
  component: RegisterScreen,
});
