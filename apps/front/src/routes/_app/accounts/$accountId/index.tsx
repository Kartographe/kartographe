// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute } from "@tanstack/react-router";
import { AccountDashboardScreen } from "@/features/accounts/dashboard/account-dashboard-screen";

export const Route = createFileRoute("/_app/accounts/$accountId/")({
  component: AccountDashboard,
});

function AccountDashboard() {
  const { accountId } = Route.useParams();
  return <AccountDashboardScreen accountId={accountId} />;
}
