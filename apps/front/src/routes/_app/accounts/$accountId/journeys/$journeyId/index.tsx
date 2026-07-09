import { createFileRoute } from "@tanstack/react-router";
import { Flex, Spin } from "antd";
import { $api } from "@/api/$api";
import { JourneyOverview } from "@/features/journeys/journey-overview";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/journeys/$journeyId/"
)({
  component: JourneyOverviewPage,
});

function JourneyOverviewPage() {
  const { accountId, journeyId } = Route.useParams();

  // The layout already guarded the 404; this only waits for the cached read.
  const journeyQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/journeys/{journey_id}",
    { params: { path: { account_id: accountId, journey_id: journeyId } } }
  );
  const journey = journeyQuery.data?.item;

  if (!journey) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 240 }}>
        <Spin />
      </Flex>
    );
  }

  return <JourneyOverview accountId={accountId} journey={journey} />;
}
