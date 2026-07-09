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
import {
  isIdentifier,
  stripNonIdentifier,
} from "@/features/databases/identifier";
import { ColorSwatch } from "@/features/databases/tables/color-swatch";
import type { ColumnTypeLookup } from "@/features/databases/use-column-types";

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
  systemField: boolean;
}

const EMPTY_DRAFT: Draft = {
  name: "",
  databaseColumnTypeId: "",
  nullable: true,
  unique: false,
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
  onComment: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** An existing column, read-only. Editing goes through the modal. */
function ColumnRow({
  column,
  columnTypes,
  onComment,
  onEdit,
  onDelete,
}: ColumnRowProps) {
  const { t } = useLingui();

  return (
    <Flex align="center" gap={8}>
      <ColorSwatch color={column.color} size={10} />
      <Typography.Text code style={{ minWidth: 160 }}>
        {column.name}
      </Typography.Text>
      <Typography.Text style={{ flex: 1 }} type="secondary">
        {columnTypes.label(column.databaseColumnTypeId)}
      </Typography.Text>
      {column.foreignKeyDatabaseTableId ? <Tag color="blue">FK</Tag> : null}
      {column.unique ? <Tag color="gold">{t`Unique`}</Tag> : null}
      {column.nullable ? <Tag>{t`Nullable`}</Tag> : null}
      {column.systemField ? <Tag>{t`Système`}</Tag> : null}

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
          column={column}
          columnTypes={columnTypes}
          key={column.id}
          onComment={() => onComment(column)}
          onDelete={() => onDelete(column)}
          onEdit={() => onEdit(column)}
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
