// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Button, Flex, Result, Spin } from "antd";
import { $api } from "@/api/$api";
import { FeatureSideNav } from "@/features/features/feature-side-nav";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/features/$featureId"
)({
  component: FeatureLayout,
});

function FeatureLayout() {
  const { t } = useLingui();
  const { accountId, featureId } = Route.useParams();

  const featureQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/features/{feature_id}",
    { params: { path: { account_id: accountId, feature_id: featureId } } }
  );

  if (featureQuery.isLoading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 240 }}>
        <Spin />
      </Flex>
    );
  }

  if (featureQuery.isError) {
    return (
      <Result
        extra={
          <Link params={{ accountId }} to="/accounts/$accountId/features">
            <Button type="primary">{t`Retour aux fonctionnalités`}</Button>
          </Link>
        }
        status="404"
        subTitle={t`Cette fonctionnalité n'existe pas ou n'est plus accessible.`}
        title={t`Fonctionnalité introuvable`}
      />
    );
  }

  return (
    <div className="h-full overflow-hidden rounded-xl border border-(--ant-color-border-secondary) bg-(--ant-color-bg-container)">
      <div className="grid h-full grid-cols-1 grid-rows-[auto_1fr] lg:grid-cols-[220px_1fr] lg:grid-rows-[1fr]">
        <aside className="min-h-0 border-(--ant-color-border-secondary) border-b lg:border-r lg:border-b-0">
          <FeatureSideNav accountId={accountId} featureId={featureId} />
        </aside>
        <main className="min-w-0 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
