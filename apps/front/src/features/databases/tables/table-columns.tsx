// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  HolderOutlined,
  KeyOutlined,
  PlusOutlined,
  RightOutlined,
} from "@ant-design/icons";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Checkbox,
  Empty,
  Flex,
  Input,
  Select,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { CommentCountButton } from "@/features/comments/comment-count-button";
import {
  isIdentifier,
  stripNonIdentifier,
} from "@/features/databases/identifier";
import { ColorSwatch } from "@/features/databases/tables/color-swatch";
import { ColumnSubfields } from "@/features/databases/tables/column-subfields";
import type { ColumnTypeLookup } from "@/features/databases/use-column-types";
import { LockIndicator } from "@/features/lock/lock-indicator";
import { LockToggleButton } from "@/features/lock/lock-toggle-button";
import { useCanManageLock } from "@/features/lock/use-can-manage-lock";
import { VotesCell } from "@/features/votes/votes-cell";

type DatabaseTable = components["schemas"]["DatabaseTableItem"];
type Column = components["schemas"]["DatabaseTableColumnItem"];

const TABLES_KEY = [
  "get",
  "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables",
];

/** The subset of a column the draft row asks for; the rest gets defaults. */
interface Draft {
  name: string;
  databaseColumnTypeId: string;
  nullable: boolean;
  unique: boolean;
  primaryKey: boolean;
  systemField: boolean;
}

const EMPTY_DRAFT: Draft = {
  name: "",
  databaseColumnTypeId: "",
  nullable: true,
  unique: false,
  primaryKey: false,
  systemField: false,
};

function isComplete(draft: Draft): boolean {
  return isIdentifier(draft.name) && draft.databaseColumnTypeId.length > 0;
}

/** The fields of the draft row. Existing columns are read-only. */
function DraftFields({
  draft,
  onChange,
  columnTypes,
  disabled,
}: {
  draft: Draft;
  onChange: (draft: Draft) => void;
  columnTypes: ColumnTypeLookup;
  disabled?: boolean;
}) {
  const { t } = useLingui();
  return (
    <>
      <Input
        disabled={disabled}
        onChange={(event) =>
          onChange({ ...draft, name: stripNonIdentifier(event.target.value) })
        }
        placeholder={t`Nom`}
        size="small"
        status={draft.name && !isIdentifier(draft.name) ? "error" : undefined}
        style={{ width: 180 }}
        value={draft.name}
      />
      <Select
        disabled={disabled}
        loading={columnTypes.isLoading}
        onChange={(value) =>
          onChange({ ...draft, databaseColumnTypeId: value })
        }
        options={columnTypes.options}
        placeholder={t`Type`}
        size="small"
        style={{ flex: 1, minWidth: 140 }}
        value={draft.databaseColumnTypeId || undefined}
      />
      <Checkbox
        checked={draft.nullable}
        disabled={disabled}
        onChange={(event) =>
          onChange({ ...draft, nullable: event.target.checked })
        }
      >
        {t`Nullable`}
      </Checkbox>
      <Checkbox
        checked={draft.unique}
        disabled={disabled}
        onChange={(event) =>
          onChange({ ...draft, unique: event.target.checked })
        }
      >
        {t`Unique`}
      </Checkbox>
      <Checkbox
        checked={draft.primaryKey}
        disabled={disabled}
        onChange={(event) =>
          onChange({ ...draft, primaryKey: event.target.checked })
        }
      >
        {t`Clé primaire`}
      </Checkbox>
      <Checkbox
        checked={draft.systemField}
        disabled={disabled}
        onChange={(event) =>
          onChange({ ...draft, systemField: event.target.checked })
        }
      >
        {t`Système`}
      </Checkbox>
    </>
  );
}

interface ColumnRowProps {
  column: Column;
  columnTypes: ColumnTypeLookup;
  canManageLock: boolean;
  lockPending: boolean;
  isJson: boolean;
  subfieldsOpen: boolean;
  onToggleSubfields: () => void;
  onComment: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleLock: () => void;
}

/**
 * An existing column, read-only, draggable by the handle on its left. Editing
 * goes through the modal.
 */
function ColumnRow({
  column,
  columnTypes,
  canManageLock,
  lockPending,
  isJson,
  subfieldsOpen,
  onToggleSubfields,
  onComment,
  onEdit,
  onDelete,
  onToggleLock,
}: ColumnRowProps) {
  const { t } = useLingui();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  return (
    <Flex
      align="center"
      gap={8}
      ref={setNodeRef}
      style={{
        opacity: isDragging ? 0.5 : 1,
        transform: CSS.Transform.toString(transform),
        transition,
        // Lift the row being dragged above its neighbours.
        zIndex: isDragging ? 1 : undefined,
      }}
    >
      <Tooltip title={t`Réordonner`}>
        <HolderOutlined
          {...attributes}
          {...listeners}
          style={{
            color: "var(--ant-color-text-tertiary)",
            cursor: "grab",
            touchAction: "none",
          }}
        />
      </Tooltip>
      <ColorSwatch color={column.color} size={10} />
      <LockIndicator
        locked={column.locked}
        lockedBy={column.lockedBy}
        lockedDate={column.lockedDate}
      />
      <Typography.Text code style={{ minWidth: 160 }}>
        {column.name}
      </Typography.Text>
      <Typography.Text style={{ flex: 1 }} type="secondary">
        {columnTypes.label(column.databaseColumnTypeId)}
      </Typography.Text>
      {column.primaryKey ? (
        <Tooltip title={t`Clé primaire`}>
          <KeyOutlined style={{ color: "var(--ant-gold-6)" }} />
        </Tooltip>
      ) : null}
      {column.foreignKeyDatabaseTableId ? <Tag color="blue">FK</Tag> : null}
      {column.unique ? <Tag color="gold">{t`Unique`}</Tag> : null}
      {column.nullable ? <Tag>{t`Nullable`}</Tag> : null}
      {column.systemField ? <Tag>{t`Système`}</Tag> : null}
      {isJson ? (
        <Tooltip
          title={subfieldsOpen ? t`Masquer les sous-champs` : t`Sous-champs`}
        >
          <Button
            icon={subfieldsOpen ? <DownOutlined /> : <RightOutlined />}
            onClick={onToggleSubfields}
            size="small"
          >
            {t`JSON`}
          </Button>
        </Tooltip>
      ) : null}

      <VotesCell
        countsByRoleValue={column.votesCountsByRoleValue}
        countsByValue={column.votesCountsByValue}
        myVote={column.myVote}
      />
      {canManageLock ? (
        <LockToggleButton
          locked={column.locked}
          onToggle={onToggleLock}
          pending={lockPending}
        />
      ) : null}
      <CommentCountButton count={column.commentCount} onClick={onComment} />
      <Tooltip title={column.locked ? t`Colonne verrouillée` : t`Modifier`}>
        <Button
          disabled={column.locked}
          icon={<EditOutlined />}
          onClick={onEdit}
          size="small"
        />
      </Tooltip>
      <Tooltip title={column.locked ? t`Colonne verrouillée` : t`Supprimer`}>
        <Button
          danger
          disabled={column.locked}
          icon={<DeleteOutlined />}
          onClick={onDelete}
          size="small"
        />
      </Tooltip>
    </Flex>
  );
}

interface TableColumnsProps {
  accountId: string;
  databaseId: string;
  versionId: string;
  table: DatabaseTable;
  columnTypes: ColumnTypeLookup;
  onComment: (column: Column) => void;
  onEdit: (column: Column) => void;
  onDelete: (column: Column) => void;
}

/**
 * A table's columns, read-only, with a draft row below them to add one. The
 * draft row asks only for what a column cannot exist without; everything else
 * — colour, foreign key, description — is set afterwards through the modal.
 */
export function TableColumns({
  accountId,
  databaseId,
  versionId,
  table,
  columnTypes,
  onComment,
  onEdit,
  onDelete,
}: TableColumnsProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  // The order shown while the server catches up; cleared once it agrees.
  const [pendingOrder, setPendingOrder] = useState<Column[] | null>(null);
  // JSON columns whose sub-field panel is expanded.
  const [openSubfields, setOpenSubfields] = useState<Set<string>>(new Set());

  function toggleSubfields(columnId: string) {
    setOpenSubfields((current) => {
      const next = new Set(current);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  }

  const sensors = useSensors(
    // A few pixels of travel before a drag starts, so the handle stays clickable.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/columns",
    { meta: { successMessage: t`Colonne créée` } }
  );
  const reorderMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/columns/reorder",
    { meta: { successMessage: t`Colonnes réordonnées` } }
  );
  const lockMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/columns/{database_table_column_id}/lock",
    { meta: { successMessage: t`Colonne verrouillée` } }
  );
  const unlockMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/columns/{database_table_column_id}/unlock",
    { meta: { successMessage: t`Colonne déverrouillée` } }
  );

  const canManageLock = useCanManageLock(accountId);
  const lockPending = lockMutation.isPending || unlockMutation.isPending;

  async function toggleColumnLock(column: Column) {
    const mutation = column.locked ? unlockMutation : lockMutation;
    await mutation.mutateAsync({
      params: {
        path: {
          account_id: accountId,
          database_id: databaseId,
          database_version_id: versionId,
          database_table_id: table.id,
          database_table_column_id: column.id,
        },
      },
    });
    queryClient.invalidateQueries({ queryKey: TABLES_KEY });
  }

  const stored = [...(table.columns ?? [])].sort((a, b) => a.rank - b.rank);
  const columns = pendingOrder ?? stored;

  async function reorder(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const from = columns.findIndex((column) => column.id === active.id);
    const to = columns.findIndex((column) => column.id === over.id);
    if (from === -1 || to === -1) {
      return;
    }

    const moved = arrayMove(columns, from, to);
    setPendingOrder(moved);
    try {
      await reorderMutation.mutateAsync({
        params: {
          path: {
            account_id: accountId,
            database_id: databaseId,
            database_version_id: versionId,
            database_table_id: table.id,
          },
        },
        body: { columnIds: moved.map((column) => column.id) },
      });
      await queryClient.invalidateQueries({ queryKey: TABLES_KEY });
    } finally {
      // Either the refetch confirms the move, or it restores the old order.
      setPendingOrder(null);
    }
  }

  async function create() {
    if (!draft) {
      return;
    }
    await createMutation.mutateAsync({
      params: {
        path: {
          account_id: accountId,
          database_id: databaseId,
          database_version_id: versionId,
          database_table_id: table.id,
        },
      },
      // `rank` orders the columns and `defaultValue` is required but not worth
      // asking for inline; both are refined in the edit modal.
      body: { ...draft, rank: columns.length, defaultValue: "" },
    });
    setDraft(null);
    queryClient.invalidateQueries({ queryKey: TABLES_KEY });
  }

  return (
    <Flex gap={8} vertical>
      <Typography.Text strong>{t`Colonnes`}</Typography.Text>

      {columns.length === 0 && !draft ? (
        <Empty
          description={t`Aucune colonne`}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : null}

      {/* Only stored columns sort; the draft row below is not part of the set. */}
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={reorder}
        sensors={sensors}
      >
        <SortableContext
          items={columns.map((column) => column.id)}
          strategy={verticalListSortingStrategy}
        >
          <Flex gap={8} vertical>
            {columns.map((column) => {
              const isJson = columnTypes.isJson(column.databaseColumnTypeId);
              const subfieldsOpen = openSubfields.has(column.id);
              return (
                <div key={column.id}>
                  <ColumnRow
                    canManageLock={canManageLock}
                    column={column}
                    columnTypes={columnTypes}
                    isJson={isJson}
                    lockPending={lockPending}
                    onComment={() => onComment(column)}
                    onDelete={() => onDelete(column)}
                    onEdit={() => onEdit(column)}
                    onToggleLock={() => toggleColumnLock(column)}
                    onToggleSubfields={() => toggleSubfields(column.id)}
                    subfieldsOpen={subfieldsOpen}
                  />
                  {isJson && subfieldsOpen ? (
                    <ColumnSubfields
                      accountId={accountId}
                      column={column}
                      columnTypes={columnTypes}
                      databaseId={databaseId}
                      tableId={table.id}
                      versionId={versionId}
                    />
                  ) : null}
                </div>
              );
            })}
          </Flex>
        </SortableContext>
      </DndContext>

      {draft ? (
        <Flex align="center" gap={8}>
          {/* Aligns the draft fields under the sortable rows, past their handle. */}
          <span style={{ width: 14 }} />
          <ColorSwatch size={10} />
          <DraftFields
            columnTypes={columnTypes}
            disabled={createMutation.isPending}
            draft={draft}
            onChange={setDraft}
          />
          <Tooltip title={t`Valider`}>
            <Button
              disabled={!isComplete(draft)}
              icon={<CheckOutlined />}
              loading={createMutation.isPending}
              onClick={create}
              size="small"
              type="primary"
            />
          </Tooltip>
          <Tooltip title={t`Annuler`}>
            <Button
              icon={<CloseOutlined />}
              onClick={() => setDraft(null)}
              size="small"
            />
          </Tooltip>
        </Flex>
      ) : null}

      <Flex>
        <Button
          disabled={!!draft}
          icon={<PlusOutlined />}
          onClick={() => setDraft(EMPTY_DRAFT)}
          size="small"
        >
          {t`Ajouter une colonne`}
        </Button>
      </Flex>
    </Flex>
  );
}
