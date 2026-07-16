// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { RolesScreen } from "@/features/applications/roles/roles-screen";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/applications/$applicationId/roles"
)({
  component: RolesPage,
});

function RolesPage() {
  const { accountId, applicationId } = Route.useParams();
  return <RolesScreen accountId={accountId} applicationId={applicationId} />;
}
