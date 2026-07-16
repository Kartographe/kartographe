// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { AccountBreadcrumb } from "@/components/app-shell/account-breadcrumb";
import { useActiveAccountStore } from "@/features/accounts/active-account-store";

export const Route = createFileRoute("/_app/accounts/$accountId")({
  component: AccountWorkspaceLayout,
});

function AccountWorkspaceLayout() {
  const { accountId } = Route.useParams();
  const setActiveId = useActiveAccountStore((state) => state.setAccountId);

  // Keep the sidebar switcher + nav in sync with the account being viewed.
  useEffect(() => {
    setActiveId(accountId);
  }, [accountId, setActiveId]);

  return (
    <>
      <AccountBreadcrumb accountId={accountId} />
      <Outlet />
    </>
  );
}
