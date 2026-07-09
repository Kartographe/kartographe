import {
  CheckOutlined,
  CloseOutlined,
  CommentOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
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
import { ColorSwatch } from "@/features/databases/tables/color-swatch";
import type { ColumnTypeLookup } from "@/features/databases/use-column-types";

type DatabaseTable = components["schemas"]["DatabaseTableItem"];
type Column = components["schemas"]["DatabaseTableColumnItem"];

const TABLES_KEY = [
  "get",
  "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables",
];

/** The subset of a column that the inline row edits. */
interface Draft {
  name: string;
  databaseColumnTypeId: string;
  nullable: boolean;
  unique: boolean;
  systemField: boolean;
}

function draftOf(column: Column): Draft {
  return {
    name: column.name,
    databaseColumnTypeId: column.databaseColumnTypeId,
    nullable: column.nullable,
    unique: column.unique,
    systemField: column.systemField,
  };
}

const EMPTY_DRAFT: Draft = {
  name: "",
  databaseColumnTypeId: "",
  nullable: true,
  unique: false,
  systemField: false,
};

function sameDraft(a: Draft, b: Draft): boolean {
  return (
    a.name === b.name &&
    a.databaseColumnTypeId === b.databaseColumnTypeId &&
    a.nullable === b.nullable &&
    a.unique === b.unique &&
    a.systemField === b.systemField
  );
}

function isComplete(draft: Draft): boolean {
  return draft.name.trim().length > 0 && draft.databaseColumnTypeId.length > 0;
}

/** The editable part of a row, shared by an existing column and a new one. */
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
        onChange={(event) => onChange({ ...draft, name: event.target.value })}
        placeholder={t`Nom`}
        size="small"
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
  accountId: string;
  databaseId: string;
  versionId: string;
  tableId: string;
  column: Column;
  columnTypes: ColumnTypeLookup;
  onComment: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * An existing column, editable in place. Name, type and the three flags are
 * changed here; the colour, the foreign key and the description stay behind the
 * edit modal, which has the room to explain them.
 */
function ColumnRow({
  accountId,
  databaseId,
  versionId,
  tableId,
  column,
  columnTypes,
  onComment,
  onEdit,
  onDelete,
}: ColumnRowProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(draftOf(column));

  const updateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/columns/{database_table_column_id}",
    { meta: { successMessage: t`Colonne mise à jour` } }
  );

  const dirty = !sameDraft(draft, draftOf(column));

  async function save() {
    await updateMutation.mutateAsync({
      params: {
        path: {
          account_id: accountId,
          database_id: databaseId,
          database_version_id: versionId,
          database_table_id: tableId,
          database_table_column_id: column.id,
        },
      },
      body: draft,
    });
    queryClient.invalidateQueries({ queryKey: TABLES_KEY });
  }

  return (
    <Flex align="center" gap={8}>
      <ColorSwatch color={column.color} size={10} />
      <DraftFields
        columnTypes={columnTypes}
        draft={draft}
        onChange={setDraft}
      />
      {column.foreignKeyDatabaseTableId ? <Tag color="blue">FK</Tag> : null}

      {dirty ? (
        <>
          <Tooltip title={t`Enregistrer`}>
            <Button
              disabled={!isComplete(draft)}
              icon={<CheckOutlined />}
              loading={updateMutation.isPending}
              onClick={save}
              size="small"
              type="primary"
            />
          </Tooltip>
          <Tooltip title={t`Annuler`}>
            <Button
              icon={<CloseOutlined />}
              onClick={() => setDraft(draftOf(column))}
              size="small"
            />
          </Tooltip>
        </>
      ) : null}

      <Tooltip title={t`Commentaires`}>
        <Button icon={<CommentOutlined />} onClick={onComment} size="small" />
      </Tooltip>
      <Tooltip title={t`Modifier`}>
        <Button icon={<EditOutlined />} onClick={onEdit} size="small" />
      </Tooltip>
      <Tooltip title={t`Supprimer`}>
        <Button
          danger
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

/** A table's columns: each editable in place, with a draft row to add one. */
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

  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/columns",
    { meta: { successMessage: t`Colonne créée` } }
  );

  const columns = table.columns ?? [];

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

      {columns.map((column) => (
        <ColumnRow
          accountId={accountId}
          column={column}
          columnTypes={columnTypes}
          databaseId={databaseId}
          key={column.id}
          onComment={() => onComment(column)}
          onDelete={() => onDelete(column)}
          onEdit={() => onEdit(column)}
          tableId={table.id}
          versionId={versionId}
        />
      ))}

      {draft ? (
        <Flex align="center" gap={8}>
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
