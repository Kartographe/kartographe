import type { components } from "@/api/generated/schema";

type Step = components["schemas"]["JourneyScenarioStepItem"];

export const STEP_NODE_WIDTH = 240;
export const STEP_NODE_HEIGHT = 88;
const SIBLING_GAP = 28;
const LEVEL_GAP = 72;

export interface StepGraphNode {
  id: string;
  step: Step;
  x: number;
  y: number;
}

export interface StepGraphEdge {
  id: string;
  source: string;
  target: string;
}

export interface StepGraph {
  nodes: StepGraphNode[];
  edges: StepGraphEdge[];
}

/**
 * Lays a scenario's steps out as a top-down tree: a step sits under its parent,
 * siblings side by side, each subtree centred over the block its children span.
 *
 * A step whose parent is missing (deleted, or outside this scenario) is treated
 * as a root rather than dropped — an unreachable step the reader cannot see is
 * worse than one drawn out of place. Cycles are broken by visiting each step at
 * most once; the API forbids a step being its own parent but says nothing about
 * a longer loop.
 */
export function layoutSteps(steps: Step[]): StepGraph {
  const byId = new Map(steps.map((step) => [step.id, step]));
  const children = new Map<string, Step[]>();
  const roots: Step[] = [];

  for (const step of steps) {
    const parentId = step.parentJourneyScenarioStepId;
    if (parentId && byId.has(parentId)) {
      const siblings = children.get(parentId) ?? [];
      siblings.push(step);
      children.set(parentId, siblings);
    } else {
      roots.push(step);
    }
  }

  const nodes: StepGraphNode[] = [];
  const edges: StepGraphEdge[] = [];
  const visited = new Set<string>();

  /** Places `step` and its subtree with the block starting at `left`; returns the block's width. */
  function place(step: Step, left: number, depth: number): number {
    visited.add(step.id);
    const kids = (children.get(step.id) ?? []).filter(
      (kid) => !visited.has(kid.id)
    );

    let childrenWidth = 0;
    for (const kid of kids) {
      const width = place(kid, left + childrenWidth, depth + 1);
      childrenWidth += width + SIBLING_GAP;
      edges.push({
        id: `${step.id}->${kid.id}`,
        source: step.id,
        target: kid.id,
      });
    }
    if (kids.length > 0) {
      childrenWidth -= SIBLING_GAP;
    }

    const blockWidth = Math.max(STEP_NODE_WIDTH, childrenWidth);
    nodes.push({
      id: step.id,
      step,
      // Centred over its children — or over its own block when it has none.
      x: left + (blockWidth - STEP_NODE_WIDTH) / 2,
      y: depth * (STEP_NODE_HEIGHT + LEVEL_GAP),
    });
    return blockWidth;
  }

  let offset = 0;
  for (const root of roots) {
    if (visited.has(root.id)) {
      continue;
    }
    offset += place(root, offset, 0) + SIBLING_GAP * 2;
  }

  // A cycle leaves its members unvisited: draw them as roots of their own.
  for (const step of steps) {
    if (!visited.has(step.id)) {
      offset += place(step, offset, 0) + SIBLING_GAP * 2;
    }
  }

  return { nodes, edges };
}
