// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { ArrowRightOutlined, PlusOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { TableProps } from "antd";
import { Button, Empty, Flex, Table, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { actionsWidth, COL, scrollX } from "@/components/table/columns";
import { complexityColumn } from "@/features/complexity/complexity-column";
import {
  ScenarioCriticityTag,
  ScenarioStatusTag,
  ScenarioTypeTag,
} from "@/features/journeys/journey-tags";
import { ScenarioFormModal } from "@/features/journeys/scenarios/scenario-form-modal";
import { votesColumn } from "@/features/votes/votes-column";

type JourneyScenario = components["schemas"]["JourneyScenarioItem"];

const LIST_KEY = [
  "get",
  "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios",
];

export function ScenariosScreen({
  accountId,
  journeyId,
}: {
  accountId: string;
  journeyId: string;
}) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  // `null` = closed, `undefined` = open in create mode.
  const [form, setForm] = useState<JourneyScenario | undefined | null>(null);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [myComplexity, setMyComplexity] = useState<string | null>(null);

  const path = { account_id: accountId, journey_id: journeyId };

  const scenariosQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios",
    {
      params: {
        path,
        query: {
          ...(myVote ? { myVote } : {}),
          ...(myComplexity ? { myComplexity } : {}),
        },
      },
    }
  );
  const statusMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}",
    { meta: { successMessage: t`Statut mis à jour` } }
  );
  const typeMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}",
    { meta: { successMessage: t`Type mis à jour` } }
  );
  const criticityMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}",
    { meta: { successMessage: t`Criticité mise à jour` } }
  );

  const scenarios = scenariosQuery.data?.items ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
  }

  async function changeStatus(
    scenario: JourneyScenario,
    status: JourneyScenario["status"]
  ) {
    await statusMutation.mutateAsync({
      params: { path: { ...path, scenario_id: scenario.id } },
      body: { status },
    });
    invalidate();
  }

  async function changeType(
    scenario: JourneyScenario,
    type: JourneyScenario["type"]
  ) {
    await typeMutation.mutateAsync({
      params: { path: { ...path, scenario_id: scenario.id } },
      body: { type },
    });
    invalidate();
  }

  async function changeCriticity(
    scenario: JourneyScenario,
    criticity: JourneyScenario["criticity"]
  ) {
    await criticityMutation.mutateAsync({
      params: { path: { ...path, scenario_id: scenario.id } },
      body: { criticity },
    });
    invalidate();
  }

  const onChange: TableProps<JourneyScenario>["onChange"] = (
    _pagination,
    filters
  ) => {
    setMyVote((filters.votes as string[] | null)?.[0] ?? null);
    setMyComplexity((filters.complexity as string[] | null)?.[0] ?? null);
  };

  const formModal =
    form === null ? null : (
      <ScenarioFormModal
        accountId={accountId}
        journeyId={journeyId}
        key={form?.id ?? "create"}
        onClose={() => setForm(null)}
        open
        scenario={form}
      />
    );

  const columns: TableProps<JourneyScenario>["columns"] = [
    {
      title: t`Titre`,
      key: "title",
      width: COL.title,
      ellipsis: true,
      render: (_, scenario) => (
        <Typography.Text>{scenario.title}</Typography.Text>
      ),
    },
    {
      title: t`Type`,
      key: "type",
      dataIndex: "type",
      width: COL.type,
      render: (type: JourneyScenario["type"], scenario) => (
        <ScenarioTypeTag
          loading={typeMutation.isPending}
          onChange={(next) => changeType(scenario, next)}
          type={type}
        />
      ),
    },
    {
      title: t`Criticité`,
      key: "criticity",
      dataIndex: "criticity",
      width: COL.status,
      render: (criticity: JourneyScenario["criticity"], scenario) => (
        <ScenarioCriticityTag
          criticity={criticity}
          loading={criticityMutation.isPending}
          onChange={(next) => changeCriticity(scenario, next)}
        />
      ),
    },
    {
      title: t`Statut`,
      key: "status",
      dataIndex: "status",
      width: COL.status,
      render: (status: JourneyScenario["status"], scenario) => (
        <ScenarioStatusTag
          loading={statusMutation.isPending}
          onChange={(next) => changeStatus(scenario, next)}
          status={status}
        />
      ),
    },
    {
      title: t`Créé le`,
      hidden: true,
      key: "date",
      dataIndex: "date",
      width: COL.date,
      render: (value: string | null) =>
        value ? dayjs(value).format("DD/MM/YYYY") : "—",
    },
    votesColumn({ t, notVotedLabel: t`Pas encore voté`, myVote }),
    complexityColumn({ t, myComplexity }),
    {
      title: "",
      key: "actions",
      align: "right",
      fixed: "right",
      width: actionsWidth({ labelled: 1 }),
      render: (_, scenario) => (
        <Link
          params={{ accountId, journeyId, scenarioId: scenario.id }}
          to="/accounts/$accountId/journeys/$journeyId/scenarios/$scenarioId"
        >
          <Button icon={<ArrowRightOutlined />} iconPosition="end" size="small">
            {t`Accéder`}
          </Button>
        </Link>
      ),
    },
  ];

  if (!scenariosQuery.isLoading && scenarios.length === 0) {
    return (
      <Flex gap={16} vertical>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t`Scénarios`}
        </Typography.Title>
        <Empty
          description={t`Ce parcours n'a aucun scénario. Décrivez le chemin nominal, puis ses variantes.`}
        >
          <Button
            icon={<PlusOutlined />}
            onClick={() => setForm(undefined)}
            type="primary"
          >
            {t`Créer un scénario`}
          </Button>
        </Empty>
        {formModal}
      </Flex>
    );
  }

  return (
    <Flex gap={16} vertical>
      <Flex align="center" justify="space-between">
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t`Scénarios`}
        </Typography.Title>
        <Button
          icon={<PlusOutlined />}
          onClick={() => setForm(undefined)}
          type="primary"
        >
          {t`Créer un scénario`}
        </Button>
      </Flex>

      <Table<JourneyScenario>
        columns={columns}
        dataSource={scenarios}
        loading={scenariosQuery.isLoading}
        onChange={onChange}
        pagination={false}
        rowKey="id"
        scroll={scrollX(columns)}
        size="small"
      />

      {formModal}
    </Flex>
  );
}
