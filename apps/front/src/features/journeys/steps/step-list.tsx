import { PlusOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { Button, Card, Flex, Tag, Typography } from "antd";
import type { components } from "@/api/generated/schema";
import { useActionTypes } from "@/features/journeys/steps/use-action-types";
import { isRichTextEmpty } from "@/lib/rich-text/rich-text";
import { RichTextView } from "@/lib/rich-text/rich-text-view";

type Step = components["schemas"]["JourneyScenarioStepItem"];

/** How far a child is inset from its parent, so depth reads at a glance. */
const INDENT = 28;

function StepCard({
  step,
  depth,
  isSelected,
  actionLabel,
  onSelect,
  onAddChild,
}: {
  step: Step;
  depth: number;
  isSelected: boolean;
  actionLabel: string | null;
  onSelect: (step: Step) => void;
  onAddChild: (step: Step) => void;
}) {
  const { t } = useLingui();

  return (
    <Flex gap={8} style={{ marginInlineStart: depth * INDENT }} vertical>
      <Card
        hoverable
        onClick={() => onSelect(step)}
        size="small"
        style={{
          borderColor: isSelected ? "var(--ant-color-primary)" : undefined,
          width: "100%",
        }}
        styles={{ body: { padding: 12 } }}
      >
        <Flex align="center" gap={12} justify="space-between">
          <Flex gap={4} style={{ minWidth: 0 }} vertical>
            <Typography.Text ellipsis strong>
              {step.title}
            </Typography.Text>
            {/* Each `RichTextView` mounts an editor — skip the empty ones. */}
            {isRichTextEmpty(step.description) ? null : (
              <RichTextView value={step.description} />
            )}
          </Flex>
          <Flex gap={4} wrap>
            {actionLabel ? (
              <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                {actionLabel}
              </Tag>
            ) : null}
            {step.optional ? (
              <Tag style={{ marginInlineEnd: 0 }}>{t`Optionnelle`}</Tag>
            ) : null}
          </Flex>
        </Flex>
      </Card>

      <Button
        icon={<PlusOutlined />}
        onClick={() => onAddChild(step)}
        size="small"
        style={{ alignSelf: "flex-start", marginInlineStart: INDENT }}
        type="dashed"
      >
        {t`Ajouter une étape`}
      </Button>
    </Flex>
  );
}

/**
 * The steps as a column of full-width cards, each inset under its parent and
 * followed by the button that adds its next step — so the scenario is written
 * where it is read, rather than through a form that asks for the parent again.
 *
 * Ordering and orphan handling mirror `layoutSteps`: a step whose parent is
 * missing is shown at the root rather than hidden.
 */
export function StepList({
  steps,
  selectedId,
  onSelect,
  onAddChild,
}: {
  steps: Step[];
  selectedId: string | undefined;
  onSelect: (step: Step) => void;
  onAddChild: (step: Step) => void;
}) {
  const actionTypes = useActionTypes();
  const byId = new Map(steps.map((step) => [step.id, step]));

  function childrenOf(parentId: string | null): Step[] {
    return steps.filter((step) => {
      const rawParent = step.parentJourneyScenarioStepId;
      const parent = rawParent && byId.has(rawParent) ? rawParent : null;
      return parent === parentId;
    });
  }

  // A cycle would recurse forever; the API forbids self-parenting but not a
  // longer loop.
  const rendered = new Set<string>();

  function renderBranch(parentId: string | null, depth: number) {
    return childrenOf(parentId)
      .filter((step) => !rendered.has(step.id))
      .map((step) => {
        rendered.add(step.id);
        return (
          <Flex gap={8} key={step.id} vertical>
            <StepCard
              actionLabel={actionTypes.label(step.actionTypeId)}
              depth={depth}
              isSelected={step.id === selectedId}
              onAddChild={onAddChild}
              onSelect={onSelect}
              step={step}
            />
            {renderBranch(step.id, depth + 1)}
          </Flex>
        );
      });
  }

  return (
    <Flex gap={8} vertical>
      {renderBranch(null, 0)}
    </Flex>
  );
}
