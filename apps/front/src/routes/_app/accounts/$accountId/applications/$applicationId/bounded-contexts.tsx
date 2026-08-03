// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { BoundedContextsScreen } from "@/features/applications/bounded-contexts/bounded-contexts-screen";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/applications/$applicationId/bounded-contexts"
)({
  component: BoundedContextsPage,
});

function BoundedContextsPage() {
  const { accountId, applicationId } = Route.useParams();
  return (
    <BoundedContextsScreen
      accountId={accountId}
      applicationId={applicationId}
    />
  );
}
