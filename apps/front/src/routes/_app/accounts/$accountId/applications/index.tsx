import { createFileRoute } from "@tanstack/react-router";
import { ApplicationsList } from "@/features/applications/applications-list";

export const Route = createFileRoute("/_app/accounts/$accountId/applications/")(
  {
    component: ApplicationsPage,
  }
);

function ApplicationsPage() {
  const { accountId } = Route.useParams();
  return <ApplicationsList accountId={accountId} />;
}
