import { useLingui } from "@lingui/react/macro";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Button, Flex, Result, Spin } from "antd";
import { $api } from "@/api/$api";
import { JourneySideNav } from "@/features/journeys/journey-side-nav";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/journeys/$journeyId"
)({
  component: JourneyLayout,
});

function JourneyLayout() {
  const { t } = useLingui();
  const { accountId, journeyId } = Route.useParams();

  const journeyQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/journeys/{journey_id}",
    { params: { path: { account_id: accountId, journey_id: journeyId } } }
  );

  if (journeyQuery.isLoading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 240 }}>
        <Spin />
      </Flex>
    );
  }

  if (journeyQuery.isError) {
    return (
      <Result
        extra={
          <Link params={{ accountId }} to="/accounts/$accountId/journeys">
            <Button type="primary">{t`Retour aux parcours`}</Button>
          </Link>
        }
        status="404"
        subTitle={t`Ce parcours n'existe pas ou n'est plus accessible.`}
        title={t`Parcours introuvable`}
      />
    );
  }

  return (
    <div className="h-full overflow-hidden rounded-xl border border-(--ant-color-border-secondary) bg-(--ant-color-bg-container)">
      <div className="grid h-full grid-cols-1 grid-rows-[auto_1fr] lg:grid-cols-[240px_1fr] lg:grid-rows-[1fr]">
        <aside className="min-h-0 overflow-y-auto border-(--ant-color-border-secondary) border-b lg:border-r lg:border-b-0">
          <JourneySideNav accountId={accountId} journeyId={journeyId} />
        </aside>
        <main className="min-w-0 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
