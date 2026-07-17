// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import {
  DeleteOutlined,
  EditOutlined,
  InboxOutlined,
  PlusOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Empty,
  Flex,
  List,
  Space,
  Tooltip,
  Typography,
} from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { AssertionStatusTag } from "@/features/journeys/journey-tags";
import { AssertionFormModal } from "@/features/journeys/steps/assertion-form-modal";
import { useAssertionTypes } from "@/features/journeys/steps/use-action-types";

type Assertion = components["schemas"]["JourneyScenarioStepAssertionItem"];

const LIST_KEY = [
  "get",
  "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps/{step_id}/assertions",
];

export function StepAssertions({
  accountId,
  journeyId,
  scenarioId,
  stepId,
}: {
  accountId: string;
  journeyId: string;
  scenarioId: string;
  stepId: string;
}) {
  const { t } = useLingui();
  const { modal } = App.useApp();
  const queryClient = useQueryClient();
  const assertionTypes = useAssertionTypes();
  // `null` = closed, `undefined` = open in create mode.
  const [form, setForm] = useState<Assertion | undefined | null>(null);

  const path = {
    account_id: accountId,
    journey_id: journeyId,
    scenario_id: scenarioId,
    step_id: stepId,
  };

  const assertionsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps/{step_id}/assertions",
    { params: { path } }
  );
  const activateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps/{step_id}/assertions/{assertion_id}",
    { meta: { successMessage: t`Assertion activée` } }
  );
  const archiveMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps/{step_id}/assertions/{assertion_id}",
    { meta: { successMessage: t`Assertion archivée` } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps/{step_id}/assertions/{assertion_id}",
    { meta: { successMessage: t`Assertion supprimée` } }
  );

  const assertions = assertionsQuery.data?.items ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
  }

  async function toggleStatus(assertion: Assertion) {
    const params = { path: { ...path, assertion_id: assertion.id } };
    if (assertion.status === "active") {
      await archiveMutation.mutateAsync({
        params,
        body: { status: "archived" },
      });
    } else {
      await activateMutation.mutateAsync({
        params,
        body: { status: "active" },
      });
    }
    invalidate();
  }

  function confirmDelete(assertion: Assertion) {
    modal.confirm({
      title: t`Supprimer cette assertion ?`,
      content: t`Cette action est irréversible.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: { ...path, assertion_id: assertion.id } },
        });
        invalidate();
      },
    });
  }

  const formModal =
    form === null ? null : (
      <AssertionFormModal
        accountId={accountId}
        assertion={form}
        journeyId={journeyId}
        key={form?.id ?? "create"}
        onClose={() => setForm(null)}
        open
        scenarioId={scenarioId}
        stepId={stepId}
      />
    );

  return (
    <Flex gap={12} vertical>
      <Flex align="center" justify="space-between">
        <Typography.Text strong>{t`Assertions`}</Typography.Text>
        <Button
          icon={<PlusOutlined />}
          onClick={() => setForm(undefined)}
          size="small"
        >
          {t`Ajouter`}
        </Button>
      </Flex>

      {assertions.length === 0 ? (
        <Empty
          description={t`Aucune assertion sur cette étape`}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <List
          dataSource={assertions}
          loading={assertionsQuery.isLoading}
          renderItem={(assertion) => (
            <List.Item
              actions={[
                <Tooltip key="edit" title={t`Modifier`}>
                  <Button
                    icon={<EditOutlined />}
                    onClick={() => setForm(assertion)}
                    size="small"
                  />
                </Tooltip>,
                <Tooltip
                  key="status"
                  title={
                    assertion.status === "active" ? t`Archiver` : t`Activer`
                  }
                >
                  <Button
                    icon={
                      assertion.status === "active" ? (
                        <InboxOutlined />
                      ) : (
                        <RocketOutlined />
                      )
                    }
                    onClick={() => toggleStatus(assertion)}
                    size="small"
                  />
                </Tooltip>,
                <Tooltip key="delete" title={t`Supprimer`}>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => confirmDelete(assertion)}
                    size="small"
                  />
                </Tooltip>,
              ]}
            >
              <List.Item.Meta
                description={
                  Object.keys(assertion.parameters).length > 0 ? (
                    <Typography.Text code>
                      {JSON.stringify(assertion.parameters)}
                    </Typography.Text>
                  ) : null
                }
                title={
                  <Space>
                    {assertionTypes.label(assertion.assertionTypeId)}
                    <AssertionStatusTag status={assertion.status} />
                  </Space>
                }
              />
            </List.Item>
          )}
          size="small"
        />
      )}

      {formModal}
    </Flex>
  );
}
