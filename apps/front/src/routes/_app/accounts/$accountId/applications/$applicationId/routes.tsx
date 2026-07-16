// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { RoutesScreen } from "@/features/applications/routes/routes-screen";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/applications/$applicationId/routes"
)({
  component: RoutesPage,
});

function RoutesPage() {
  const { accountId, applicationId } = Route.useParams();
  return <RoutesScreen accountId={accountId} applicationId={applicationId} />;
}
