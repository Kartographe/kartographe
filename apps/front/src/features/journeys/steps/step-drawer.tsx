import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import {
  Button,
  Descriptions,
  Divider,
  Drawer,
  Flex,
  Segmented,
  Space,
  Tag,
  Typography,
} from "antd";
import { useState } from "react";
import type { components } from "@/api/generated/schema";
import { StepAssertions } from "@/features/journeys/steps/step-assertions";
import { StepFiles } from "@/features/journeys/steps/step-files";
import { StepRoutes } from "@/features/journeys/steps/step-routes";
import { useActionTypes } from "@/features/journeys/steps/use-action-types";
import { RichTextView } from "@/lib/rich-text/rich-text-view";

type Step = components["schemas"]["JourneyScenarioStepItem"];

type Panel = "files" | "assertions" | "routes";

export function StepDrawer({
  accountId,
  journeyId,
  scenarioId,
  /** The drawer is open exactly when a step is passed. */
  step,
  parentTitle,
  onEdit,
  onAddChild,
  onDelete,
  onClose,
}: {
  accountId: string;
  journeyId: string;
  scenarioId: string;
  step: Step | undefined;
  parentTitle: string | null;
  onEdit: (step: Step) => void;
  onAddChild: (step: Step) => void;
  onDelete: (step: Step) => void;
  onClose: () => void;
}) {
  const { t } = useLingui();
  const actionTypes = useActionTypes();
  const [panel, setPanel] = useState<Panel>("files");

  const actionLabel = actionTypes.label(step?.actionTypeId);
  const parameters = step?.parameters ?? {};
  const hasParameters = Object.keys(parameters).length > 0;

  return (
    <Drawer
      destroyOnHidden
      extra={
        step ? (
          <Space>
            <Button
              icon={<PlusOutlined />}
              onClick={() => onAddChild(step)}
              size="small"
            >
              {t`Étape suivante`}
            </Button>
            <Button
              icon={<EditOutlined />}
              onClick={() => onEdit(step)}
              size="small"
            />
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDelete(step)}
              size="small"
            />
          </Space>
        ) : null
      }
      onClose={onClose}
      open={!!step}
      title={
        step ? (
          <Flex align="center" gap={12} style={{ minWidth: 0 }}>
            <Typography.Text ellipsis strong>
              {step.title}
            </Typography.Text>
            {step.optional ? <Tag>{t`Optionnelle`}</Tag> : null}
          </Flex>
        ) : (
          t`Étape`
        )
      }
      width={520}
    >
      {step ? (
        <Flex gap={16} vertical>
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label={t`Action`}>
              {actionLabel ? (
                <Tag color="blue">{actionLabel}</Tag>
              ) : (
                t`Aucune action`
              )}
            </Descriptions.Item>
            <Descriptions.Item label={t`Étape précédente`}>
              {parentTitle ?? t`Aucune (étape racine)`}
            </Descriptions.Item>
            {hasParameters ? (
              <Descriptions.Item label={t`Paramètres`}>
                <Flex gap={4} vertical>
                  {Object.entries(parameters).map(([key, value]) => (
                    <Typography.Text key={key}>
                      {`${key} : `}
                      <Typography.Text code>
                        {typeof value === "object"
                          ? JSON.stringify(value)
                          : String(value)}
                      </Typography.Text>
                    </Typography.Text>
                  ))}
                </Flex>
              </Descriptions.Item>
            ) : null}
            <Descriptions.Item label={t`Description`}>
              <RichTextView value={step.description} />
            </Descriptions.Item>
          </Descriptions>

          <Divider style={{ margin: 0 }} />

          <Segmented
            block
            onChange={(value) => setPanel(value as Panel)}
            options={[
              { label: t`Fichiers`, value: "files" },
              { label: t`Assertions`, value: "assertions" },
              { label: t`Routes`, value: "routes" },
            ]}
            value={panel}
          />

          {/* Keyed on the step: switching steps must not carry a panel's state
              (an open modal, a pending upload) onto the next one. */}
          {panel === "files" ? (
            <StepFiles
              accountId={accountId}
              journeyId={journeyId}
              key={`files-${step.id}`}
              scenarioId={scenarioId}
              stepId={step.id}
            />
          ) : null}
          {panel === "assertions" ? (
            <StepAssertions
              accountId={accountId}
              journeyId={journeyId}
              key={`assertions-${step.id}`}
              scenarioId={scenarioId}
              stepId={step.id}
            />
          ) : null}
          {panel === "routes" ? (
            <StepRoutes
              accountId={accountId}
              journeyId={journeyId}
              key={`routes-${step.id}`}
              scenarioId={scenarioId}
              stepId={step.id}
            />
          ) : null}
        </Flex>
      ) : null}
    </Drawer>
  );
}
