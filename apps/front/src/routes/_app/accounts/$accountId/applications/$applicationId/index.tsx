import { createFileRoute } from "@tanstack/react-router";
import { Flex, Spin } from "antd";
import { $api } from "@/api/$api";
import { ApplicationOverview } from "@/features/applications/application-overview";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/applications/$applicationId/"
)({
  component: ApplicationOverviewPage,
});

function ApplicationOverviewPage() {
  const { accountId, applicationId } = Route.useParams();
  const applicationQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/applications/{application_id}",
    {
      params: {
        path: { account_id: accountId, application_id: applicationId },
      },
    }
  );
  const application = applicationQuery.data?.item;

  if (!application) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 240 }}>
        <Spin />
      </Flex>
    );
  }

  return (
    <ApplicationOverview accountId={accountId} application={application} />
  );
}
