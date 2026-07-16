// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { GuardsScreen } from "@/features/applications/guards/guards-screen";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/applications/$applicationId/guards"
)({
  component: GuardsPage,
});

function GuardsPage() {
  const { accountId, applicationId } = Route.useParams();
  return <GuardsScreen accountId={accountId} applicationId={applicationId} />;
}
