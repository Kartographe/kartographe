// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import type { components } from "@/api/generated/schema";

type DatabaseTable = components["schemas"]["DatabaseTableItem"];

export const NODE_WIDTH = 260;
const HEADER_HEIGHT = 44;
const ROW_HEIGHT = 26;
const COLUMN_GAP = 120;
const ROW_GAP = 48;
/** A table referencing more than this many hops is almost certainly a cycle. */
const MAX_DEPTH = 32;

type Column = components["schemas"]["DatabaseTableColumnItem"];

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

export interface GraphNode {
  id: string;
  table: DatabaseTable;
  x: number;
  y: number;
}

/** Which of a table's columns the node actually draws. */
export type ColumnFilter = (column: Column) => boolean;

function nodeHeight(table: DatabaseTable, isVisible: ColumnFilter): number {
  const rows = (table.columns ?? []).filter(isVisible).length;
  return HEADER_HEIGHT + rows * ROW_HEIGHT;
}

/**
 * How many foreign-key hops separate a table from one that references nothing.
 * Roots (no outgoing FK) sit in the left-most column, their referrers to the
 * right, so arrows mostly flow one way and the diagram reads without crossings.
 *
 * Self-references and cycles are bounded by `MAX_DEPTH` rather than detected:
 * a schema can legitimately contain one (a `parent_id` on a tree), and it must
 * not hang the layout.
 */
function computeDepths(tables: DatabaseTable[]): Map<string, number> {
  const byId = new Map(tables.map((table) => [table.id, table]));
  const depths = new Map<string, number>();

  function depthOf(table: DatabaseTable, seen: Set<string>): number {
    const cached = depths.get(table.id);
    if (cached !== undefined) {
      return cached;
    }
    if (seen.has(table.id) || seen.size > MAX_DEPTH) {
      return 0;
    }
    seen.add(table.id);

    let depth = 0;
    for (const column of table.columns ?? []) {
      const targetId = column.foreignKeyDatabaseTableId;
      const target = targetId ? byId.get(targetId) : undefined;
      if (target && target.id !== table.id) {
        depth = Math.max(depth, depthOf(target, seen) + 1);
      }
    }
    seen.delete(table.id);
    depths.set(table.id, depth);
    return depth;
  }

  for (const table of tables) {
    depthOf(table, new Set());
  }
  return depths;
}

/**
 * Places tables in FK-depth columns and derives one edge per foreign key.
 *
 * `isVisible` only sizes the nodes: a relationship holds whether or not the
 * column carrying it is drawn, so edges always come from the full column set.
 */
export function layoutSchema(
  tables: DatabaseTable[],
  isVisible: ColumnFilter
): {
  nodes: GraphNode[];
  edges: GraphEdge[];
} {
  const depths = computeDepths(tables);
  const byDepth = new Map<number, DatabaseTable[]>();
  for (const table of tables) {
    const depth = depths.get(table.id) ?? 0;
    const bucket = byDepth.get(depth) ?? [];
    bucket.push(table);
    byDepth.set(depth, bucket);
  }

  const nodes: GraphNode[] = [];
  for (const [depth, bucket] of byDepth) {
    let y = 0;
    for (const table of bucket) {
      nodes.push({
        id: table.id,
        table,
        x: depth * (NODE_WIDTH + COLUMN_GAP),
        y,
      });
      y += nodeHeight(table, isVisible) + ROW_GAP;
    }
  }

  const known = new Set(tables.map((table) => table.id));
  const edges: GraphEdge[] = [];
  for (const table of tables) {
    for (const column of table.columns ?? []) {
      const targetId = column.foreignKeyDatabaseTableId;
      // A FK pointing outside this version has no node to attach to.
      if (!(targetId && known.has(targetId))) {
        continue;
      }
      edges.push({
        id: `${table.id}:${column.id}`,
        source: table.id,
        target: targetId,
      });
    }
  }

  return { nodes, edges };
}
