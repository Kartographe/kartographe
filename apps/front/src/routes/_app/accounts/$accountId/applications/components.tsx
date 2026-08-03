// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { AccountComponentsList } from "@/features/applications/components/account-components-list";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/applications/components"
)({
  component: AccountComponentsPage,
});

function AccountComponentsPage() {
  const { accountId } = Route.useParams();
  return <AccountComponentsList accountId={accountId} />;
}
