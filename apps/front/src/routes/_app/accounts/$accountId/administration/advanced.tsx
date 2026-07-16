// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { AccountAdvanced } from "@/features/accounts/administration/account-advanced";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/administration/advanced"
)({
  component: () => <AccountAdvanced accountId={Route.useParams().accountId} />,
});
