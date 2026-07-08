import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { AccountDetail } from "@/features/accounts/account-detail";
import { useActiveAccountStore } from "@/features/accounts/active-account-store";

export const Route = createFileRoute("/_app/accounts/$accountId")({
  component: AccountWorkspaceRoute,
});

function AccountWorkspaceRoute() {
  const { accountId } = Route.useParams();
  const setActiveId = useActiveAccountStore((state) => state.setAccountId);

  // Keep the sidebar switcher in sync with the account being viewed.
  useEffect(() => {
    setActiveId(accountId);
  }, [accountId, setActiveId]);

  return <AccountDetail accountId={accountId} />;
}
