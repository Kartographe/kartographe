// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { ArrowRightOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { TableProps } from "antd";
import { Button, Empty, Flex, Table, Typography } from "antd";
import dayjs from "dayjs";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { dtoEnums } from "@/api/generated/schema.enums";
import { actionsWidth, COL, scrollX } from "@/components/table/columns";
import { EditablePersonasCell } from "@/features/journeys/editable-personas-cell";
import {
  ScenarioCriticityTag,
  ScenarioStatusTag,
  ScenarioTypeTag,
} from "@/features/journeys/journey-tags";
import {
  SCENARIO_CRITICITY_LABELS,
  SCENARIO_STATUS_LABELS,
  SCENARIO_TYPE_LABELS,
} from "@/features/journeys/labels";
import { usePersonas } from "@/features/journeys/use-personas";
import { LockIndicator } from "@/features/lock/lock-indicator";
import { PAGE_SIZES, useListView } from "@/features/preferences/use-list-view";
import { EditableTagsCell } from "@/features/tags/editable-tags-cell";
import { useTagFilters } from "@/features/tags/use-tag-filters";
import { votesColumn } from "@/features/votes/votes-column";

type Scenario = components["schemas"]["JourneyScenarioListItem"];
type Status = components["schemas"]["JourneyScenarioStatus"];
type Type = components["schemas"]["JourneyScenarioType"];
type Criticity = components["schemas"]["JourneyScenarioCriticity"];
type SortField = components["schemas"]["JourneyScenarioSortField"];

const LIST_KEY = ["get", "/v1/accounts/{account_id}/scenarios"];

const SORT_FIELD: Record<string, SortField> = {
  title: "title",
  date: "date",
  status: "status",
  type: "type",
  criticity: "criticity",
};

/**
 * Every scenario of the account, across journeys — the entry point when you
 * think in terms of scenarios rather than of the journey carrying them. Each
 * row links back to its parent journey and to the scenario itself.
 */
export function AccountScenariosList({ accountId }: { accountId: string }) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const personas = usePersonas(accountId);

  const view = useListView<Scenario, SortField>(
    accountId,
    "scenarios",
    { filters: {}, limit: 25, page: 1, sortBy: "date", sortOrder: "desc" },
    SORT_FIELD
  );
  const statuses = (view.filterValue("status") ?? []) as Status[];
  const types = (view.filterValue("type") ?? []) as Type[];
  const criticities = (view.filterValue("criticity") ?? []) as Criticity[];
  const tagIds = view.filterValue("tags") ?? [];
  const personasIds = view.filterValue("personasIds") ?? [];
  const myVote = view.firstFilterValue("votes");

  const tagFilters = useTagFilters(accountId, "journey_scenario");

  const scenariosQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/scenarios",
    {
      params: {
        path: { account_id: accountId },
        query: {
          page: view.page,
          limit: view.limit,
          sortBy: view.sortBy,
          sortOrder: view.sortOrder,
          ...(statuses.length ? { status: statuses } : {}),
          ...(types.length ? { type: types } : {}),
          ...(criticities.length ? { criticity: criticities } : {}),
          ...(tagIds.length ? { tagIds } : {}),
          ...(personasIds.length ? { personasIds } : {}),
          ...(myVote ? { myVote } : {}),
        },
      },
    },
    { enabled: view.ready }
  );

  const patchMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}",
    { meta: { successMessage: t`Scénario mis à jour` } }
  );

  const scenarios = scenariosQuery.data?.items ?? [];
  const total = scenariosQuery.data?.count ?? 0;
  const loading = !view.ready || scenariosQuery.isLoading;

  async function patch(
    scenario: Scenario,
    body: components["schemas"]["JourneyScenarioPatchForm"]
  ) {
    await patchMutation.mutateAsync({
      params: {
        path: {
          account_id: accountId,
          journey_id: scenario.journeyId,
          scenario_id: scenario.id,
        },
      },
      body,
    });
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
  }

  const columns: TableProps<Scenario>["columns"] = [
    {
      title: t`Titre`,
      key: "title",
      dataIndex: "title",
      sorter: true,
      sortOrder: view.sortOrderFor("title"),
      width: COL.title,
      ellipsis: true,
      render: (title: string, scenario) => (
        <Flex align="center" gap={6}>
          <LockIndicator
            locked={scenario.locked}
            lockedBy={scenario.lockedBy}
            lockedDate={scenario.lockedDate}
          />
          <Typography.Text ellipsis>{title}</Typography.Text>
        </Flex>
      ),
    },
    {
      title: t`Parcours`,
      key: "journeyTitle",
      dataIndex: "journeyTitle",
      width: COL.title,
      ellipsis: true,
      render: (journeyTitle: string | null, scenario) =>
        journeyTitle ? (
          <Link
            params={{ accountId, journeyId: scenario.journeyId }}
            to="/accounts/$accountId/journeys/$journeyId"
          >
            {journeyTitle}
          </Link>
        ) : (
          <Typography.Text type="secondary">{t`Parcours supprimé`}</Typography.Text>
        ),
    },
    {
      title: t`Type`,
      key: "type",
      dataIndex: "type",
      sorter: true,
      sortOrder: view.sortOrderFor("type"),
      width: COL.type,
      filters: dtoEnums.JourneyScenarioType.map((value) => ({
        text: t(SCENARIO_TYPE_LABELS[value]),
        value,
      })),
      filteredValue: view.filterValue("type"),
      render: (type: Type, scenario) => (
        <ScenarioTypeTag
          loading={patchMutation.isPending}
          onChange={
            scenario.locked
              ? undefined
              : (next) => patch(scenario, { type: next })
          }
          type={type}
        />
      ),
    },
    {
      title: t`Criticité`,
      key: "criticity",
      dataIndex: "criticity",
      sorter: true,
      sortOrder: view.sortOrderFor("criticity"),
      width: COL.status,
      filters: dtoEnums.JourneyScenarioCriticity.map((value) => ({
        text: t(SCENARIO_CRITICITY_LABELS[value]),
        value,
      })),
      filteredValue: view.filterValue("criticity"),
      render: (criticity: Criticity, scenario) => (
        <ScenarioCriticityTag
          criticity={criticity}
          loading={patchMutation.isPending}
          onChange={
            scenario.locked
              ? undefined
              : (next) => patch(scenario, { criticity: next })
          }
        />
      ),
    },
    {
      title: t`Statut`,
      key: "status",
      dataIndex: "status",
      sorter: true,
      sortOrder: view.sortOrderFor("status"),
      width: COL.status,
      filters: dtoEnums.JourneyScenarioStatus.map((value) => ({
        text: t(SCENARIO_STATUS_LABELS[value]),
        value,
      })),
      filteredValue: view.filterValue("status"),
      render: (status: Status, scenario) => (
        <ScenarioStatusTag
          loading={patchMutation.isPending}
          onChange={
            scenario.locked
              ? undefined
              : (next) => patch(scenario, { status: next })
          }
          status={status}
        />
      ),
    },
    {
      title: t`Personas`,
      key: "personasIds",
      dataIndex: "personasIds",
      width: COL.tags,
      filters: personas.filters,
      filteredValue: view.filterValue("personasIds"),
      render: (_ids: string[], scenario) => (
        <EditablePersonasCell
          accountId={accountId}
          loading={patchMutation.isPending}
          onChange={(next) => patch(scenario, { personasIds: next })}
          readOnly={scenario.locked}
          value={scenario.personasIds}
          wrap={false}
        />
      ),
    },
    {
      title: t`Tags`,
      key: "tags",
      dataIndex: "tags",
      width: COL.tags,
      filters: tagFilters,
      filteredValue: view.filterValue("tags"),
      render: (tags: Scenario["tags"], scenario) => (
        <EditableTagsCell
          accountId={accountId}
          entityType="journey_scenario"
          loading={patchMutation.isPending}
          onChange={(next) => patch(scenario, { tagIds: next })}
          readOnly={scenario.locked}
          tags={tags}
          value={scenario.tagIds}
        />
      ),
    },
    {
      title: t`Créé le`,
      hidden: true,
      key: "date",
      dataIndex: "date",
      sorter: true,
      sortOrder: view.sortOrderFor("date"),
      width: COL.date,
      render: (value: string | null) =>
        value ? dayjs(value).format("DD/MM/YYYY") : "—",
    },
    votesColumn({ t, notVotedLabel: t`Pas encore voté`, myVote }),
    {
      title: "",
      key: "actions",
      align: "right",
      fixed: "right",
      width: actionsWidth({ labelled: 1 }),
      render: (_, scenario) => (
        <Link
          params={{
            accountId,
            journeyId: scenario.journeyId,
            scenarioId: scenario.id,
          }}
          to="/accounts/$accountId/journeys/$journeyId/scenarios/$scenarioId"
        >
          <Button icon={<ArrowRightOutlined />} iconPosition="end" size="small">
            {t`Accéder`}
          </Button>
        </Link>
      ),
    },
  ];

  if (total === 0 && !(view.hasFilters || loading)) {
    return (
      <Flex gap={16} vertical>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t`Scénarios`}
        </Typography.Title>
        <Empty
          description={t`Aucun scénario sur ce compte. Les scénarios se créent depuis un parcours utilisateur.`}
        >
          <Link params={{ accountId }} to="/accounts/$accountId/journeys">
            <Button type="primary">{t`Voir les parcours`}</Button>
          </Link>
        </Empty>
      </Flex>
    );
  }

  return (
    <Flex gap={16} vertical>
      <Typography.Title level={3} style={{ margin: 0 }}>
        {t`Scénarios`}
      </Typography.Title>

      <Table<Scenario>
        columns={columns}
        dataSource={scenarios}
        loading={loading}
        onChange={view.onTableChange}
        pagination={{
          current: view.page,
          pageSize: view.limit,
          total,
          showSizeChanger: true,
          pageSizeOptions: PAGE_SIZES,
        }}
        rowKey="id"
        scroll={scrollX(columns)}
        size="small"
      />
    </Flex>
  );
}
