// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { MigrationsScreen } from "@/features/databases/migrations/migrations-screen";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/databases/$databaseId/migrations/"
)({
  component: MigrationsPage,
});

function MigrationsPage() {
  const { accountId, databaseId } = Route.useParams();
  return <MigrationsScreen accountId={accountId} databaseId={databaseId} />;
}
