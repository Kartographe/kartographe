import { createFileRoute } from "@tanstack/react-router";
import { JourneyCommentsScreen } from "@/features/journeys/comments/journey-comments-screen";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/journeys/$journeyId/comments"
)({
  component: JourneyCommentsPage,
});

function JourneyCommentsPage() {
  const { accountId, journeyId } = Route.useParams();
  return <JourneyCommentsScreen accountId={accountId} journeyId={journeyId} />;
}
