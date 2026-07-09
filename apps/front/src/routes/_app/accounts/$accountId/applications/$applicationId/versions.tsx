import { createFileRoute } from "@tanstack/react-router";
import { VersionsScreen } from "@/features/applications/versions/versions-screen";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/applications/$applicationId/versions"
)({
  component: VersionsPage,
});

function VersionsPage() {
  const { accountId, applicationId } = Route.useParams();
  return <VersionsScreen accountId={accountId} applicationId={applicationId} />;
}
