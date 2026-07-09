import { createFileRoute } from "@tanstack/react-router";
import { DatabasesList } from "@/features/databases/databases-list";

export const Route = createFileRoute("/_app/accounts/$accountId/databases/")({
  component: DatabasesPage,
});

function DatabasesPage() {
  const { accountId } = Route.useParams();
  return <DatabasesList accountId={accountId} />;
}
