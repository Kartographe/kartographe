// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { JourneyFeaturesScreen } from "@/features/journeys/features/journey-features-screen";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/journeys/$journeyId/features"
)({
  component: JourneyFeaturesPage,
});

function JourneyFeaturesPage() {
  const { accountId, journeyId } = Route.useParams();
  return <JourneyFeaturesScreen accountId={accountId} journeyId={journeyId} />;
}
