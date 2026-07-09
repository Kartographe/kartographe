import { useLingui } from "@lingui/react/macro";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  type NodeProps,
  Position,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Empty, Flex, Tag, Typography } from "antd";
import type { components } from "@/api/generated/schema";
import {
  layoutSteps,
  STEP_NODE_HEIGHT,
  STEP_NODE_WIDTH,
} from "@/features/journeys/steps/step-layout";
import { useActionTypes } from "@/features/journeys/steps/use-action-types";

type Step = components["schemas"]["JourneyScenarioStepItem"];

interface StepNodeData extends Record<string, unknown> {
  step: Step;
  actionLabel: string | null;
  isSelected: boolean;
}

function StepNode({ data }: NodeProps & { data: StepNodeData }) {
  const { t } = useLingui();
  const { step, actionLabel, isSelected } = data;

  return (
    <div
      style={{
        background: "var(--ant-color-bg-container)",
        border: `1px solid ${isSelected ? "var(--ant-color-primary)" : "var(--ant-color-border)"}`,
        borderRadius: 10,
        boxShadow: isSelected
          ? "0 0 0 2px var(--ant-color-primary-bg)"
          : undefined,
        boxSizing: "border-box",
        height: STEP_NODE_HEIGHT,
        padding: 12,
        width: STEP_NODE_WIDTH,
      }}
    >
      <Handle position={Position.Top} type="target" />
      <Flex gap={6} vertical>
        <Typography.Text ellipsis strong>
          {step.title}
        </Typography.Text>
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
      <Handle position={Position.Bottom} type="source" />
    </div>
  );
}

const NODE_TYPES = { step: StepNode };

export function StepFlow({
  steps,
  selectedId,
  onSelect,
}: {
  steps: Step[];
  selectedId: string | undefined;
  onSelect: (step: Step) => void;
}) {
  const { t } = useLingui();
  const actionTypes = useActionTypes();

  if (steps.length === 0) {
    return <Empty description={t`Aucune étape à afficher`} />;
  }

  const { nodes, edges } = layoutSteps(steps);

  return (
    <div
      style={{
        border: "1px solid var(--ant-color-border-secondary)",
        borderRadius: 12,
        height: 560,
      }}
    >
      <ReactFlow
        edges={edges.map((edge) => ({
          ...edge,
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed },
          type: "smoothstep",
        }))}
        fitView
        nodes={nodes.map((node) => ({
          id: node.id,
          position: { x: node.x, y: node.y },
          type: "step",
          data: {
            step: node.step,
            actionLabel: actionTypes.label(node.step.actionTypeId),
            isSelected: node.id === selectedId,
          } satisfies StepNodeData,
        }))}
        nodesConnectable={false}
        nodeTypes={NODE_TYPES}
        onNodeClick={(_event, node) => {
          const found = steps.find((step) => step.id === node.id);
          if (found) {
            onSelect(found);
          }
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
