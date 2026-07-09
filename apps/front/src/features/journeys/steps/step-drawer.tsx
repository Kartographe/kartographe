import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import {
  Button,
  Descriptions,
  Divider,
  Drawer,
  Flex,
  Space,
  Tag,
  Typography,
} from "antd";
import type { components } from "@/api/generated/schema";
import { StepAssertions } from "@/features/journeys/steps/step-assertions";
import { useActionTypes } from "@/features/journeys/steps/use-action-types";
import { RichTextView } from "@/lib/rich-text/rich-text-view";

type Step = components["schemas"]["JourneyScenarioStepItem"];

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

          <StepAssertions
            accountId={accountId}
            journeyId={journeyId}
            scenarioId={scenarioId}
            stepId={step.id}
          />
        </Flex>
      ) : null}
    </Drawer>
  );
}
