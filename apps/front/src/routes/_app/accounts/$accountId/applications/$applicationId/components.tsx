// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { ComponentsScreen } from "@/features/applications/components/components-screen";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/applications/$applicationId/components"
)({
  component: ComponentsPage,
});

function ComponentsPage() {
  const { accountId, applicationId } = Route.useParams();
  return (
    <ComponentsScreen accountId={accountId} applicationId={applicationId} />
  );
}
