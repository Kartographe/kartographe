import { createFileRoute } from "@tanstack/react-router";
import { EnvironmentsScreen } from "@/features/applications/environments/environments-screen";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/applications/$applicationId/environments"
)({
  component: EnvironmentsPage,
});

function EnvironmentsPage() {
  const { accountId, applicationId } = Route.useParams();
  return (
    <EnvironmentsScreen accountId={accountId} applicationId={applicationId} />
  );
}
