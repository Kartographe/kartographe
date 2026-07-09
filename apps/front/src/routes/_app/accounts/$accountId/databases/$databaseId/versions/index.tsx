import { createFileRoute } from "@tanstack/react-router";
import { VersionsScreen } from "@/features/databases/versions/versions-screen";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/databases/$databaseId/versions/"
)({
  component: VersionsPage,
});

function VersionsPage() {
  const { accountId, databaseId } = Route.useParams();
  return <VersionsScreen accountId={accountId} databaseId={databaseId} />;
}
