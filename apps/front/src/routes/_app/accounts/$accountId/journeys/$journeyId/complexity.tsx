// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { ComplexityPanel } from "@/features/complexity/complexity-panel";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/journeys/$journeyId/complexity"
)({
  component: JourneyComplexityPage,
});

function JourneyComplexityPage() {
  const { accountId, journeyId } = Route.useParams();
  return (
    <ComplexityPanel
      accountId={accountId}
      entityId={journeyId}
      entityType="journey"
    />
  );
}
