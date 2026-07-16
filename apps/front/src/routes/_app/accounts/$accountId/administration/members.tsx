// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { AccountMembersScreen } from "@/features/accounts/administration/account-members-screen";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/administration/members"
)({
  component: () => (
    <AccountMembersScreen accountId={Route.useParams().accountId} />
  ),
});
