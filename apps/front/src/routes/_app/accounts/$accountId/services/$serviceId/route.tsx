import { useLingui } from "@lingui/react/macro";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Button, Flex, Result, Spin } from "antd";
import { $api } from "@/api/$api";
import { ServiceSideNav } from "@/features/services/service-side-nav";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/services/$serviceId"
)({
  component: ServiceLayout,
});

function ServiceLayout() {
  const { t } = useLingui();
  const { accountId, serviceId } = Route.useParams();

  const serviceQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/services/{service_id}",
    { params: { path: { account_id: accountId, service_id: serviceId } } }
  );

  if (serviceQuery.isLoading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 240 }}>
        <Spin />
      </Flex>
    );
  }

  if (serviceQuery.isError) {
    return (
      <Result
        extra={
          <Link params={{ accountId }} to="/accounts/$accountId/services">
            <Button type="primary">{t`Retour aux services`}</Button>
          </Link>
        }
        status="404"
        subTitle={t`Ce service n'existe pas ou n'est plus accessible.`}
        title={t`Service introuvable`}
      />
    );
  }

  return (
    <div className="h-full overflow-hidden rounded-xl border border-(--ant-color-border-secondary) bg-(--ant-color-bg-container)">
      <div className="grid h-full grid-cols-1 grid-rows-[auto_1fr] lg:grid-cols-[220px_1fr] lg:grid-rows-[1fr]">
        <aside className="min-h-0 border-(--ant-color-border-secondary) border-b lg:border-r lg:border-b-0">
          <ServiceSideNav accountId={accountId} serviceId={serviceId} />
        </aside>
        <main className="min-w-0 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
