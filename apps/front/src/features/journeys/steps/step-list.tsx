// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { Flex, Steps, Tag, Typography } from "antd";
import type { components } from "@/api/generated/schema";
import { useActionTypes } from "@/features/journeys/steps/use-action-types";
import { isRichTextEmpty } from "@/lib/rich-text/rich-text";
import { RichTextView } from "@/lib/rich-text/rich-text-view";

type Step = components["schemas"]["JourneyScenarioStepItem"];

/**
 * The steps in the order they are walked.
 *
 * A scenario reads as a timeline, but the model is a tree (`parentId`), so the
 * order is a depth-first pre-order: with no branching that *is* the timeline,
 * and a branch — should one exist — trails its parent rather than vanishing.
 * A step whose parent is missing starts a chain of its own instead of being
 * dropped; a cycle is broken by walking each step at most once.
 *
 * Every step comes back, whatever the parent links say. Walking from the roots
 * alone is not enough: a ring (A → B → A) has no root, so that walk returns
 * nothing at all and a scenario full of steps renders as a blank page with no
 * error to explain it. Steps the walk never reached are appended in the order
 * the API returned them.
 */
function orderSteps(steps: Step[]): Step[] {
  const byId = new Map(steps.map((step) => [step.id, step]));
  const children = new Map<string | null, Step[]>();

  for (const step of steps) {
    const raw = step.parentJourneyScenarioStepId;
    const parent = raw && byId.has(raw) ? raw : null;
    const siblings = children.get(parent) ?? [];
    siblings.push(step);
    children.set(parent, siblings);
  }

  const ordered: Step[] = [];
  const walked = new Set<string>();

  function walk(parentId: string | null) {
    for (const step of children.get(parentId) ?? []) {
      if (walked.has(step.id)) {
        continue;
      }
      walked.add(step.id);
      ordered.push(step);
      walk(step.id);
    }
  }
  walk(null);
  for (const step of steps) {
    if (!walked.has(step.id)) {
      walked.add(step.id);
      ordered.push(step);
      walk(step.id);
    }
  }

  return ordered;
}

/**
 * The scenario as a vertical timeline: one step per row.
 *
 * Adding is driven from the header, where the form asks for the preceding step
 * — the API then inserts the new one right after it, rather than appending.
 */
export function StepList({
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

  const ordered = orderSteps(steps);

  return (
    <Steps
      // `current` defaults to `0`, which would make the first step *the* current
      // one: styled as reached, and unclickable — antd skips `onChange` when the
      // clicked index is already `current`. No step is current here.
      current={-1}
      direction="vertical"
      items={ordered.map((step) => {
        const actionLabel = actionTypes.label(step.actionTypeId);
        return {
          // Per item, never through `current`: that would mark every step above
          // the selected one as "finished", and a scenario is a plan, not a run.
          status:
            step.id === selectedId ? ("process" as const) : ("wait" as const),
          title: (
            <Flex align="center" gap={8} wrap>
              {actionLabel ? (
                <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                  {actionLabel}
                </Tag>
              ) : null}
              <Typography.Text strong>{step.title}</Typography.Text>
              {step.optional ? (
                <Tag style={{ marginInlineEnd: 0 }}>{t`Optionnelle`}</Tag>
              ) : null}
            </Flex>
          ),
          // Each `RichTextView` mounts an editor — skip the empty ones.
          description: isRichTextEmpty(step.description) ? null : (
            <RichTextView value={step.description} />
          ),
        };
      })}
      onChange={(index) => {
        const step = ordered[index];
        if (step) {
          onSelect(step);
        }
      }}
    />
  );
}
