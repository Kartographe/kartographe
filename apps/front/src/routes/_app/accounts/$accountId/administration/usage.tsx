// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { AccountUsageScreen } from "@/features/accounts/administration/account-usage-screen";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/administration/usage"
)({
  component: () => (
    <AccountUsageScreen accountId={Route.useParams().accountId} />
  ),
});
