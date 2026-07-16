// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { FeatureJourneysScreen } from "@/features/features/journeys/feature-journeys-screen";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/features/$featureId/journeys"
)({
  component: FeatureJourneysPage,
});

function FeatureJourneysPage() {
  const { accountId, featureId } = Route.useParams();
  return <FeatureJourneysScreen accountId={accountId} featureId={featureId} />;
}
