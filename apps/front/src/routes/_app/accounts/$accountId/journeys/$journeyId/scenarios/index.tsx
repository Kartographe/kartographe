import { createFileRoute } from "@tanstack/react-router";
import { ScenariosScreen } from "@/features/journeys/scenarios/scenarios-screen";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/journeys/$journeyId/scenarios/"
)({
  component: ScenariosPage,
});

function ScenariosPage() {
  const { accountId, journeyId } = Route.useParams();
  return <ScenariosScreen accountId={accountId} journeyId={journeyId} />;
}
