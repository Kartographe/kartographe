// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { FeatureFilesScreen } from "@/features/features/files/feature-files-screen";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/features/$featureId/files"
)({
  component: FeatureFilesPage,
});

function FeatureFilesPage() {
  const { accountId, featureId } = Route.useParams();
  return <FeatureFilesScreen accountId={accountId} featureId={featureId} />;
}
