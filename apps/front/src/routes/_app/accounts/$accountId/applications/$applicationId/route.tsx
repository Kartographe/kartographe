// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Button, Flex, Result, Spin } from "antd";
import { $api } from "@/api/$api";
import { ApplicationSideNav } from "@/features/applications/application-side-nav";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/applications/$applicationId"
)({
  component: ApplicationLayout,
});

function ApplicationLayout() {
  const { t } = useLingui();
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

  if (applicationQuery.isLoading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 240 }}>
        <Spin />
      </Flex>
    );
  }

  if (applicationQuery.isError) {
    return (
      <Result
        extra={
          <Link params={{ accountId }} to="/accounts/$accountId/applications">
            <Button type="primary">{t`Retour aux applications`}</Button>
          </Link>
        }
        status="404"
        subTitle={t`Cette application n'existe pas ou n'est plus accessible.`}
        title={t`Application introuvable`}
      />
    );
  }

  return (
    <div className="h-full overflow-hidden rounded-xl border border-(--ant-color-border-secondary) bg-(--ant-color-bg-container)">
      <div className="grid h-full grid-cols-1 grid-rows-[auto_1fr] lg:grid-cols-[220px_1fr] lg:grid-rows-[1fr]">
        <aside className="min-h-0 border-(--ant-color-border-secondary) border-b lg:border-r lg:border-b-0">
          <ApplicationSideNav
            accountId={accountId}
            applicationId={applicationId}
          />
        </aside>
        <main className="min-w-0 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
