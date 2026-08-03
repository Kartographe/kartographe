// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { ComplexityPanel } from "@/features/complexity/complexity-panel";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/features/$featureId/complexity"
)({
  component: FeatureComplexityPage,
});

function FeatureComplexityPage() {
  const { accountId, featureId } = Route.useParams();
  return (
    <ComplexityPanel
      accountId={accountId}
      entityId={featureId}
      entityType="feature"
    />
  );
}
