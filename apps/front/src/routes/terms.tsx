// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { TermsScreen } from "@/features/legal/terms-screen";

export const Route = createFileRoute("/terms")({
  component: TermsScreen,
});
