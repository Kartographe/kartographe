import { useLingui } from "@lingui/react/macro";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Button, Flex, Result, Spin } from "antd";
import { $api } from "@/api/$api";
import { AccountAdminSideNav } from "@/features/accounts/administration/account-admin-side-nav";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/administration"
)({
  component: AccountAdministrationLayout,
});

function AccountAdministrationLayout() {
  const { t } = useLingui();
  const { accountId } = Route.useParams();

  const accountQuery = $api.useQuery("get", "/v1/accounts/{account_id}", {
    params: { path: { account_id: accountId } },
  });
  const role = accountQuery.data?.item.membership?.role;
  const isAdmin = role === "owner" || role === "administrator";

  if (accountQuery.isLoading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 240 }}>
        <Spin />
      </Flex>
    );
  }

  if (!isAdmin) {
    return (
      <Result
        extra={
          <Link params={{ accountId }} to="/accounts/$accountId">
            <Button type="primary">{t`Retour au compte`}</Button>
          </Link>
        }
        status="403"
        subTitle={t`Vous n'avez pas les droits d'administration sur ce compte.`}
        title={t`Accès refusé`}
      />
    );
  }

  return (
    <div className="h-full overflow-hidden rounded-xl border border-(--ant-color-border-secondary) bg-(--ant-color-bg-container)">
      <div className="grid h-full grid-cols-1 grid-rows-[auto_1fr] lg:grid-cols-[220px_1fr] lg:grid-rows-[1fr]">
        <aside className="min-h-0 border-(--ant-color-border-secondary) border-b lg:border-r lg:border-b-0">
          <AccountAdminSideNav accountId={accountId} />
        </aside>
        <main className="min-w-0 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
