// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { LinksPanel } from "@/features/links/links-panel";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/journeys/$journeyId/links"
)({
  component: JourneyLinksPage,
});

function JourneyLinksPage() {
  const { accountId, journeyId } = Route.useParams();
  return (
    <LinksPanel
      accountId={accountId}
      entityId={journeyId}
      entityType="journey"
    />
  );
}
