// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { FeatureCommentsScreen } from "@/features/features/comments/feature-comments-screen";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/features/$featureId/comments"
)({
  component: FeatureCommentsPage,
});

function FeatureCommentsPage() {
  const { accountId, featureId } = Route.useParams();
  return <FeatureCommentsScreen accountId={accountId} featureId={featureId} />;
}
