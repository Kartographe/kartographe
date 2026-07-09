import { createFileRoute } from "@tanstack/react-router";
import { ActionsScreen } from "@/features/services/actions/actions-screen";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/services/$serviceId/actions"
)({
  component: ActionsPage,
});

function ActionsPage() {
  const { accountId, serviceId } = Route.useParams();
  return <ActionsScreen accountId={accountId} serviceId={serviceId} />;
}
