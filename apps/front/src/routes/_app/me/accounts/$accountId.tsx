import { createFileRoute } from "@tanstack/react-router";
import { AccountDetail } from "@/features/accounts/account-detail";

export const Route = createFileRoute("/_app/me/accounts/$accountId")({
  component: AccountDetailRoute,
});

function AccountDetailRoute() {
  const { accountId } = Route.useParams();
  return <AccountDetail accountId={accountId} />;
}
