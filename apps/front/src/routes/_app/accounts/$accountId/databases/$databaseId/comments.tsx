// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { DatabaseCommentsScreen } from "@/features/databases/comments/database-comments-screen";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/databases/$databaseId/comments"
)({
  component: DatabaseCommentsPage,
});

function DatabaseCommentsPage() {
  const { accountId, databaseId } = Route.useParams();
  return (
    <DatabaseCommentsScreen accountId={accountId} databaseId={databaseId} />
  );
}
