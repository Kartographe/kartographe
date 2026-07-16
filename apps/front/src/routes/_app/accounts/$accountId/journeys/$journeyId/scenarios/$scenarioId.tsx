// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button, Flex, Result, Spin } from "antd";
import { $api } from "@/api/$api";
import { ScenarioScreen } from "@/features/journeys/scenarios/scenario-screen";

export const Route = createFileRoute(
  "/_app/accounts/$accountId/journeys/$journeyId/scenarios/$scenarioId"
)({
  component: ScenarioPage,
});

function ScenarioPage() {
  const { t } = useLingui();
  const { accountId, journeyId, scenarioId } = Route.useParams();

  const scenarioQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}",
    {
      params: {
        path: {
          account_id: accountId,
          journey_id: journeyId,
          scenario_id: scenarioId,
        },
      },
    }
  );

  if (scenarioQuery.isError) {
    return (
      <Result
        extra={
          <Link
            params={{ accountId, journeyId }}
            to="/accounts/$accountId/journeys/$journeyId/scenarios"
          >
            <Button type="primary">{t`Retour aux scénarios`}</Button>
          </Link>
        }
        status="404"
        subTitle={t`Ce scénario n'existe pas ou n'est plus accessible.`}
        title={t`Scénario introuvable`}
      />
    );
  }

  const scenario = scenarioQuery.data?.item;

  if (!scenario) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 240 }}>
        <Spin />
      </Flex>
    );
  }

  return (
    <ScenarioScreen
      accountId={accountId}
      journeyId={journeyId}
      scenario={scenario}
    />
  );
}
