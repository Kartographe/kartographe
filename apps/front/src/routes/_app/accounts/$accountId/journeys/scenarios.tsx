// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { AccountScenariosList } from "@/features/journeys/scenarios/account-scenarios-list";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/journeys/scenarios"
)({
  component: AccountScenariosPage,
});

function AccountScenariosPage() {
  const { accountId } = Route.useParams();
  return <AccountScenariosList accountId={accountId} />;
}
