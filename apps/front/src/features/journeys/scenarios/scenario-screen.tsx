// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { App, Button, Empty, Flex, Space, Tag, Typography } from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import {
  ScenarioCriticityTag,
  ScenarioStatusTag,
  ScenarioTypeTag,
} from "@/features/journeys/journey-tags";
import { ScenarioFormModal } from "@/features/journeys/scenarios/scenario-form-modal";
import { StepDrawer } from "@/features/journeys/steps/step-drawer";
import { StepFormModal } from "@/features/journeys/steps/step-form-modal";
import { StepList } from "@/features/journeys/steps/step-list";
import { usePersonas } from "@/features/journeys/use-personas";
import { RichTextView } from "@/lib/rich-text/rich-text-view";

type JourneyScenario = components["schemas"]["JourneyScenarioItem"];
type Step = components["schemas"]["JourneyScenarioStepItem"];

const STEPS_KEY = [
  "get",
  "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps",
];

/** What the step modal is doing: editing a step, or adding one under a parent. */
interface StepFormState {
  step?: Step;
  parentId?: string;
}

export function ScenarioScreen({
  accountId,
  journeyId,
  scenario,
}: {
  accountId: string;
  journeyId: string;
  scenario: JourneyScenario;
}) {
  const { t } = useLingui();
  const { modal } = App.useApp();
  const queryClient = useQueryClient();
  const personas = usePersonas(accountId);
  const [editScenarioOpen, setEditScenarioOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [stepForm, setStepForm] = useState<StepFormState | null>(null);

  const path = {
    account_id: accountId,
    journey_id: journeyId,
    scenario_id: scenario.id,
  };

  const stepsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps",
    { params: { path } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps/{step_id}",
    { meta: { successMessage: t`Étape supprimée` } }
  );
  const criticityMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}",
    { meta: { successMessage: t`Criticité mise à jour` } }
  );
  const typeMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}",
    { meta: { successMessage: t`Type mis à jour` } }
  );
  const statusMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}",
    { meta: { successMessage: t`Statut mis à jour` } }
  );

  const steps = stepsQuery.data?.items ?? [];
  const stepById = new Map(steps.map((step) => [step.id, step]));
  const selected = selectedId ? stepById.get(selectedId) : undefined;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: STEPS_KEY });
  }

  function invalidateScenario() {
    queryClient.invalidateQueries({
      queryKey: [
        "get",
        "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}",
      ],
    });
  }

  async function changeCriticity(criticity: JourneyScenario["criticity"]) {
    await criticityMutation.mutateAsync({
      params: { path },
      body: { criticity },
    });
    invalidateScenario();
  }

  async function changeType(type: JourneyScenario["type"]) {
    await typeMutation.mutateAsync({ params: { path }, body: { type } });
    invalidateScenario();
  }

  async function changeStatus(status: JourneyScenario["status"]) {
    await statusMutation.mutateAsync({ params: { path }, body: { status } });
    invalidateScenario();
  }

  function confirmDeleteStep(step: Step) {
    modal.confirm({
      title: t`Supprimer ${step.title} ?`,
      content: t`Les étapes qui en découlent, leurs fichiers et leurs assertions seront supprimés également. Cette action est irréversible.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: { ...path, step_id: step.id } },
        });
        // The drawer was showing a step that no longer exists.
        setSelectedId(undefined);
        invalidate();
      },
    });
  }

  const addButton = (
    <Button
      icon={<PlusOutlined />}
      onClick={() => setStepForm({})}
      type="primary"
    >
      {t`Ajouter une étape`}
    </Button>
  );

  const stepModal =
    stepForm === null ? null : (
      <StepFormModal
        accountId={accountId}
        journeyId={journeyId}
        key={stepForm.step?.id ?? `create-${stepForm.parentId ?? "root"}`}
        onClose={() => setStepForm(null)}
        open
        parentId={stepForm.parentId}
        scenarioId={scenario.id}
        step={stepForm.step}
        steps={steps}
      />
    );

  return (
    <Flex gap={16} vertical>
      <Flex align="center" justify="space-between">
        <Typography.Title level={4} style={{ margin: 0 }}>
          {scenario.title}
        </Typography.Title>
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => setEditScenarioOpen(true)}
          >
            {t`Modifier`}
          </Button>
          {addButton}
        </Space>
      </Flex>

      <Flex align="center" gap={8} wrap>
        <ScenarioTypeTag
          loading={typeMutation.isPending}
          onChange={changeType}
          type={scenario.type}
        />
        <ScenarioCriticityTag
          criticity={scenario.criticity}
          loading={criticityMutation.isPending}
          onChange={changeCriticity}
        />
        <ScenarioStatusTag
          loading={statusMutation.isPending}
          onChange={changeStatus}
          status={scenario.status}
        />
        {scenario.personasIds.map((id) => (
          <Tag key={id} style={{ marginInlineEnd: 0 }}>
            {personas.title(id) ?? t`Persona inconnu`}
          </Tag>
        ))}
      </Flex>

      {scenario.description ? (
        <RichTextView value={scenario.description} />
      ) : null}

      {steps.length === 0 && !stepsQuery.isLoading ? (
        <Empty
          description={t`Ce scénario n'a aucune étape. Décrivez ce que fait l'utilisateur, pas à pas.`}
        >
          {addButton}
        </Empty>
      ) : (
        <StepList
          onSelect={(step) => setSelectedId(step.id)}
          selectedId={selectedId}
          steps={steps}
        />
      )}

      <StepDrawer
        accountId={accountId}
        journeyId={journeyId}
        onAddChild={(step) => setStepForm({ parentId: step.id })}
        onClose={() => setSelectedId(undefined)}
        onDelete={confirmDeleteStep}
        onEdit={(step) => setStepForm({ step })}
        parentTitle={
          selected?.parentJourneyScenarioStepId
            ? (stepById.get(selected.parentJourneyScenarioStepId)?.title ??
              null)
            : null
        }
        scenarioId={scenario.id}
        step={selected}
      />

      <ScenarioFormModal
        accountId={accountId}
        journeyId={journeyId}
        onClose={() => setEditScenarioOpen(false)}
        open={editScenarioOpen}
        scenario={scenario}
      />

      {stepModal}
    </Flex>
  );
}
