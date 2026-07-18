// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { VotesPanel } from "@/features/votes/votes-panel";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/journeys/$journeyId/votes"
)({
  component: JourneyVotesPage,
});

function JourneyVotesPage() {
  const { accountId, journeyId } = Route.useParams();
  return (
    <VotesPanel
      accountId={accountId}
      entityId={journeyId}
      entityType="journey"
    />
  );
}
