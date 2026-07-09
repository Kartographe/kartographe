import {
  ArrowRightOutlined,
  DeleteOutlined,
  EditOutlined,
  InboxOutlined,
  PlusOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  App,
  Button,
  Empty,
  Flex,
  Space,
  Table,
  Tooltip,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import {
  ScenarioCriticityTag,
  ScenarioStatusTag,
  ScenarioTypeTag,
} from "@/features/journeys/journey-tags";
import { ScenarioFormModal } from "@/features/journeys/scenarios/scenario-form-modal";

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
  const { modal } = App.useApp();
  const queryClient = useQueryClient();
  // `null` = closed, `undefined` = open in create mode.
  const [form, setForm] = useState<JourneyScenario | undefined | null>(null);

  const path = { account_id: accountId, journey_id: journeyId };

  const scenariosQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios",
    { params: { path } }
  );
  const activateMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/activate",
    { meta: { successMessage: t`Scénario activé` } }
  );
  const archiveMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/archive",
    { meta: { successMessage: t`Scénario archivé` } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}",
    { meta: { successMessage: t`Scénario supprimé` } }
  );

  const scenarios = scenariosQuery.data?.items ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
  }

  async function toggleStatus(scenario: JourneyScenario) {
    const params = { path: { ...path, scenario_id: scenario.id } };
    if (scenario.status === "archived") {
      await activateMutation.mutateAsync({ params });
    } else {
      await archiveMutation.mutateAsync({ params });
    }
    invalidate();
  }

  function confirmDelete(scenario: JourneyScenario) {
    modal.confirm({
      title: t`Supprimer ${scenario.title} ?`,
      content: t`Ses étapes, leurs fichiers et leurs assertions seront supprimés également. Cette action est irréversible.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: { ...path, scenario_id: scenario.id } },
        });
        invalidate();
      },
    });
  }

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
        columns={[
          {
            title: t`Titre`,
            key: "title",
            render: (_, scenario) => (
              <Typography.Text>{scenario.title}</Typography.Text>
            ),
          },
          {
            title: t`Type`,
            key: "type",
            dataIndex: "type",
            render: (type: JourneyScenario["type"]) => (
              <ScenarioTypeTag type={type} />
            ),
          },
          {
            title: t`Criticité`,
            key: "criticity",
            dataIndex: "criticity",
            render: (criticity: JourneyScenario["criticity"]) => (
              <ScenarioCriticityTag criticity={criticity} />
            ),
          },
          {
            title: t`Statut`,
            key: "status",
            dataIndex: "status",
            render: (status: JourneyScenario["status"]) => (
              <ScenarioStatusTag status={status} />
            ),
          },
          {
            title: t`Créé le`,
            key: "date",
            dataIndex: "date",
            render: (value: string | null) =>
              value ? dayjs(value).format("DD/MM/YYYY") : "—",
          },
          {
            title: "",
            key: "actions",
            align: "right",
            render: (_, scenario) => (
              <Space>
                <Link
                  params={{ accountId, journeyId, scenarioId: scenario.id }}
                  to="/accounts/$accountId/journeys/$journeyId/scenarios/$scenarioId"
                >
                  <Button
                    icon={<ArrowRightOutlined />}
                    iconPosition="end"
                    size="small"
                  >
                    {t`Accéder`}
                  </Button>
                </Link>
                <Tooltip title={t`Modifier`}>
                  <Button
                    icon={<EditOutlined />}
                    onClick={() => setForm(scenario)}
                    size="small"
                  />
                </Tooltip>
                <Tooltip
                  title={
                    scenario.status === "archived" ? t`Activer` : t`Archiver`
                  }
                >
                  <Button
                    icon={
                      scenario.status === "archived" ? (
                        <RocketOutlined />
                      ) : (
                        <InboxOutlined />
                      )
                    }
                    onClick={() => toggleStatus(scenario)}
                    size="small"
                  />
                </Tooltip>
                <Tooltip title={t`Supprimer`}>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => confirmDelete(scenario)}
                    size="small"
                  />
                </Tooltip>
              </Space>
            ),
          },
        ]}
        dataSource={scenarios}
        loading={scenariosQuery.isLoading}
        pagination={false}
        rowKey="id"
        size="small"
      />

      {formModal}
    </Flex>
  );
}
