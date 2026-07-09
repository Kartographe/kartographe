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
  layoutSchema,
  NODE_WIDTH,
} from "@/features/databases/tables/graph-layout";
import type { ColumnTypeLookup } from "@/features/databases/use-column-types";

type DatabaseTable = components["schemas"]["DatabaseTableItem"];

interface TableNodeData extends Record<string, unknown> {
  table: DatabaseTable;
  typeLabel: (id: string) => string;
}

function TableNode({ data }: NodeProps) {
  const { table, typeLabel } = data as TableNodeData;
  const columns = table.columns ?? [];

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

      <div
        style={{
          background: "var(--ant-color-fill-quaternary)",
          borderBottom: "1px solid var(--ant-color-border-secondary)",
          padding: "10px 12px",
        }}
      >
        <Typography.Text ellipsis strong style={{ fontSize: 13 }}>
          {`${table.schema}.${table.name}`}
        </Typography.Text>
      </div>

      {columns.map((column) => (
        <Flex
          align="center"
          gap={6}
          key={column.id}
          style={{
            fontSize: 11,
            height: 26,
            padding: "0 12px",
          }}
        >
          <Typography.Text ellipsis style={{ flex: 1, fontSize: 11 }}>
            {column.name}
          </Typography.Text>
          <Typography.Text style={{ fontSize: 10 }} type="secondary">
            {typeLabel(column.databaseColumnTypeId)}
          </Typography.Text>
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
      ))}
    </div>
  );
}

const NODE_TYPES = { table: TableNode };

/**
 * Read-only entity-relationship diagram. Positions are derived from the foreign
 * keys on every render — nothing about the layout is persisted, so moving a
 * table around is deliberately not offered.
 */
export function SchemaGraph({
  tables,
  columnTypes,
}: {
  tables: DatabaseTable[];
  columnTypes: ColumnTypeLookup;
}) {
  const { t } = useLingui();
  const { nodes, edges } = layoutSchema(tables);

  if (tables.length === 0) {
    return <Empty description={t`Aucune table à représenter`} />;
  }

  return (
    <div
      style={{
        border: "1px solid var(--ant-color-border-secondary)",
        borderRadius: 8,
        height: 560,
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
          data: { table: node.table, typeLabel: columnTypes.label },
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
  );
}
