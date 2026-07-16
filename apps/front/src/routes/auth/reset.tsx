// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ResetScreen } from "@/features/auth/screens/reset-screen";

const searchSchema = z.object({ token: z.string().optional() });

export const Route = createFileRoute("/auth/reset")({
  validateSearch: searchSchema,
  component: ResetRoute,
});

function ResetRoute() {
  const { token } = Route.useSearch();
  return <ResetScreen token={token} />;
}
