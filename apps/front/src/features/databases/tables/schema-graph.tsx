// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { KeyOutlined } from "@ant-design/icons";
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
import { Checkbox, Empty, Flex, Tag, Typography } from "antd";
import { useState } from "react";
import type { components } from "@/api/generated/schema";
import { ColorSwatch } from "@/features/databases/tables/color-swatch";
import {
  type ColumnFilter,
  layoutSchema,
  NODE_WIDTH,
} from "@/features/databases/tables/graph-layout";
import type { ColumnTypeLookup } from "@/features/databases/use-column-types";

type DatabaseTable = components["schemas"]["DatabaseTableItem"];
type Column = components["schemas"]["DatabaseTableColumnItem"];
type Subfield = components["schemas"]["DatabaseTableColumnSubfieldItem"];

/** Flatten a column's sub-fields into rank-ordered rows carrying their depth. */
function flattenSubfields(
  subfields: Subfield[]
): { item: Subfield; depth: number }[] {
  const byParent = new Map<string | null, Subfield[]>();
  for (const subfield of subfields) {
    const key = subfield.parentSubfieldId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(subfield);
    byParent.set(key, list);
  }
  const rows: { item: Subfield; depth: number }[] = [];
  const walk = (parentId: string | null, depth: number) => {
    const list = [...(byParent.get(parentId) ?? [])].sort(
      (a, b) => a.rank - b.rank
    );
    for (const item of list) {
      rows.push({ item, depth });
      walk(item.id, depth + 1);
    }
  };
  walk(null, 0);
  return rows;
}

interface TableNodeData extends Record<string, unknown> {
  table: DatabaseTable;
  typeLabel: (id: string) => string;
  isVisible: ColumnFilter;
}

function TableNode({ data }: NodeProps) {
  const { table, typeLabel, isVisible } = data as TableNodeData;
  const columns = (table.columns ?? []).filter(isVisible);

  return (
    <div
      style={{
        background: "var(--ant-color-bg-container)",
        border: "1px solid var(--ant-color-border)",
        borderRadius: 8,
        overflow: "hidden",
        width: NODE_WIDTH,
      }}
    >
      {/* One handle per side: edges attach to the table, not to a column row. */}
      <Handle position={Position.Left} type="target" />
      <Handle position={Position.Right} type="source" />

      <Flex
        align="center"
        gap={8}
        style={{
          background: "var(--ant-color-fill-quaternary)",
          borderBottom: "1px solid var(--ant-color-border-secondary)",
          padding: "10px 12px",
        }}
      >
        <ColorSwatch color={table.color} />
        <Typography.Text ellipsis strong style={{ fontSize: 13 }}>
          {`${table.schema}.${table.name}`}
        </Typography.Text>
      </Flex>

      {columns.map((column) => (
        <div key={column.id}>
          <Flex
            align="center"
            gap={6}
            style={{ fontSize: 11, height: 26, padding: "0 12px" }}
          >
            <ColorSwatch color={column.color} size={8} />
            <Typography.Text ellipsis style={{ flex: 1, fontSize: 11 }}>
              {column.name}
            </Typography.Text>
            <Typography.Text style={{ fontSize: 10 }} type="secondary">
              {typeLabel(column.databaseColumnTypeId)}
            </Typography.Text>
            {column.primaryKey ? (
              <KeyOutlined
                style={{ color: "var(--ant-gold-6)", fontSize: 10 }}
              />
            ) : null}
            {column.foreignKeyDatabaseTableId ? (
              <Tag
                color="blue"
                style={{ fontSize: 9, lineHeight: "14px", margin: 0 }}
              >
                FK
              </Tag>
            ) : null}
            {column.unique ? (
              <Tag
                color="gold"
                style={{ fontSize: 9, lineHeight: "14px", margin: 0 }}
              >
                UQ
              </Tag>
            ) : null}
          </Flex>
          {flattenSubfields(column.subfields ?? []).map(({ item, depth }) => (
            <Flex
              align="center"
              gap={6}
              key={item.id}
              style={{
                fontSize: 10,
                height: 22,
                padding: "0 12px",
                paddingInlineStart: 24 + depth * 12,
              }}
            >
              <Typography.Text
                ellipsis
                style={{ flex: 1, fontSize: 10 }}
                type="secondary"
              >
                {item.name}
              </Typography.Text>
              <Typography.Text style={{ fontSize: 9 }} type="secondary">
                {typeLabel(item.databaseColumnTypeId)}
              </Typography.Text>
            </Flex>
          ))}
        </div>
      ))}
    </div>
  );
}

const NODE_TYPES = { table: TableNode };

/**
 * Read-only entity-relationship diagram. Positions are derived from the foreign
 * keys on every render — nothing about the layout is persisted, so moving a
 * table around is deliberately not offered.
 *
 * By default it draws only what carries a relationship: foreign keys, no system
 * fields. A schema of any size is unreadable otherwise, and the full column list
 * is one click away in the list view.
 */
export function SchemaGraph({
  tables,
  columnTypes,
}: {
  tables: DatabaseTable[];
  columnTypes: ColumnTypeLookup;
}) {
  const { t } = useLingui();
  const [showSystem, setShowSystem] = useState(false);
  const [showNonFk, setShowNonFk] = useState(false);

  function isVisible(column: Column): boolean {
    if (!showSystem && column.systemField) {
      return false;
    }
    return showNonFk || !!column.foreignKeyDatabaseTableId;
  }

  const { nodes, edges } = layoutSchema(tables, isVisible);

  if (tables.length === 0) {
    return <Empty description={t`Aucune table à représenter`} />;
  }

  return (
    <Flex gap={12} style={{ flex: 1, minHeight: 0 }} vertical>
      <Flex gap={16}>
        <Checkbox
          checked={showSystem}
          onChange={(event) => setShowSystem(event.target.checked)}
        >
          {t`Afficher les champs système`}
        </Checkbox>
        <Checkbox
          checked={showNonFk}
          onChange={(event) => setShowNonFk(event.target.checked)}
        >
          {t`Afficher les colonnes non FK`}
        </Checkbox>
      </Flex>

      <div
        style={{
          border: "1px solid var(--ant-color-border-secondary)",
          borderRadius: 8,
          flex: 1,
          minHeight: 0,
        }}
      >
        <ReactFlow
          edges={edges.map((edge) => ({
            ...edge,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: "var(--ant-color-primary)" },
          }))}
          fitView
          nodes={nodes.map((node) => ({
            id: node.id,
            type: "table",
            position: { x: node.x, y: node.y },
            data: {
              table: node.table,
              typeLabel: columnTypes.label,
              isVisible,
            },
          }))}
          nodesConnectable={false}
          nodesDraggable={false}
          nodeTypes={NODE_TYPES}
          proOptions={{ hideAttribution: false }}
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </Flex>
  );
}
