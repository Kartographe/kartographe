import { createFileRoute } from "@tanstack/react-router";
import { AccountInformation } from "@/features/accounts/administration/account-information";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/administration/information"
)({
  component: () => (
    <AccountInformation accountId={Route.useParams().accountId} />
  ),
});
