import { createFileRoute } from "@tanstack/react-router";
import { Flex, Spin } from "antd";
import { $api } from "@/api/$api";
import { ServiceOverview } from "@/features/services/service-overview";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/services/$serviceId/"
)({
  component: ServiceOverviewPage,
});

function ServiceOverviewPage() {
  const { accountId, serviceId } = Route.useParams();
  const serviceQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/services/{service_id}",
    { params: { path: { account_id: accountId, service_id: serviceId } } }
  );
  const service = serviceQuery.data?.item;

  if (!service) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 240 }}>
        <Spin />
      </Flex>
    );
  }

  return <ServiceOverview accountId={accountId} service={service} />;
}
