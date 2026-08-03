// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { ComplexityPanel } from "@/features/complexity/complexity-panel";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/databases/$databaseId/complexity"
)({
  component: DatabaseComplexityPage,
});

function DatabaseComplexityPage() {
  const { accountId, databaseId } = Route.useParams();
  return (
    <ComplexityPanel
      accountId={accountId}
      entityId={databaseId}
      entityType="database"
    />
  );
}
