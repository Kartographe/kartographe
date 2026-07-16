// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { AccountInvitationsScreen } from "@/features/accounts/administration/account-invitations-screen";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/administration/invitations"
)({
  component: () => (
    <AccountInvitationsScreen accountId={Route.useParams().accountId} />
  ),
});
