import { createFileRoute } from "@tanstack/react-router";
import { JourneysList } from "@/features/journeys/journeys-list";

export const Route = createFileRoute("/_app/accounts/$accountId/journeys/")({
  component: JourneysPage,
});

function JourneysPage() {
  const { accountId } = Route.useParams();
  return <JourneysList accountId={accountId} />;
}
