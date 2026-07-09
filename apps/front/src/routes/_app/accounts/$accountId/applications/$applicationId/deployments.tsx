import { createFileRoute } from "@tanstack/react-router";
import { DeploymentsScreen } from "@/features/applications/deployments/deployments-screen";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/applications/$applicationId/deployments"
)({
  component: DeploymentsPage,
});

function DeploymentsPage() {
  const { accountId, applicationId } = Route.useParams();
  return (
    <DeploymentsScreen accountId={accountId} applicationId={applicationId} />
  );
}
