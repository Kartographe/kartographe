import { createFileRoute } from "@tanstack/react-router";
import { Flex, Spin } from "antd";
import { $api } from "@/api/$api";
import { FeatureOverview } from "@/features/features/feature-overview";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/features/$featureId/"
)({
  component: FeatureOverviewPage,
});

function FeatureOverviewPage() {
  const { accountId, featureId } = Route.useParams();

  // The layout already guarded the 404; this only waits for the cached read.
  const featureQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/features/{feature_id}",
    { params: { path: { account_id: accountId, feature_id: featureId } } }
  );
  const feature = featureQuery.data?.item;

  if (!feature) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 240 }}>
        <Spin />
      </Flex>
    );
  }

  return <FeatureOverview accountId={accountId} feature={feature} />;
}
