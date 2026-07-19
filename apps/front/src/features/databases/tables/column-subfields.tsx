// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Empty,
  Flex,
  Popconfirm,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { SubfieldFormModal } from "@/features/databases/tables/subfield-form-modal";
import type { ColumnTypeLookup } from "@/features/databases/use-column-types";

type Column = components["schemas"]["DatabaseTableColumnItem"];
type Subfield = components["schemas"]["DatabaseTableColumnSubfieldItem"];

const TABLES_KEY = [
  "get",
  "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables",
];
const SUBFIELDS_KEY = [
  "get",
  "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/columns/{database_table_column_id}/subfields",
];

/** A sub-field being created (under an optional parent) or edited. */
interface SubfieldEdit {
  subfield?: Subfield;
  parentSubfieldId: string | null;
  nextRank: number;
}

interface SubfieldRowProps {
  subfield: Subfield;
  childSubfields: Subfield[];
  byParent: Map<string | null, Subfield[]>;
  depth: number;
  columnTypes: ColumnTypeLookup;
  onAddChild: (parentId: string, nextRank: number) => void;
  onEdit: (subfield: Subfield) => void;
  onDelete: (subfield: Subfield) => void;
}

function SubfieldRow({
  subfield,
  childSubfields,
  byParent,
  depth,
  columnTypes,
  onAddChild,
  onEdit,
  onDelete,
}: SubfieldRowProps) {
  const { t } = useLingui();
  return (
    <>
      <Flex align="center" gap={8} style={{ paddingInlineStart: depth * 20 }}>
        <Typography.Text code style={{ minWidth: 140 }}>
          {subfield.name}
        </Typography.Text>
        <Typography.Text style={{ flex: 1 }} type="secondary">
          {columnTypes.label(subfield.databaseColumnTypeId)}
        </Typography.Text>
        {subfield.nullable ? <Tag>{t`Nullable`}</Tag> : null}
        <Tooltip title={t`Ajouter un sous-champ`}>
          <Button
            icon={<PlusOutlined />}
            onClick={() => onAddChild(subfield.id, childSubfields.length)}
            size="small"
          />
        </Tooltip>
        <Tooltip title={t`Modifier`}>
          <Button
            icon={<EditOutlined />}
            onClick={() => onEdit(subfield)}
            size="small"
          />
        </Tooltip>
        <Popconfirm
          cancelText={t`Annuler`}
          okButtonProps={{ danger: true }}
          okText={t`Supprimer`}
          onConfirm={() => onDelete(subfield)}
          title={t`Supprimer ce sous-champ ?`}
        >
          <Button danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      </Flex>
      {childSubfields.map((child) => (
        <SubfieldRow
          byParent={byParent}
          childSubfields={byParent.get(child.id) ?? []}
          columnTypes={columnTypes}
          depth={depth + 1}
          key={child.id}
          onAddChild={onAddChild}
          onDelete={onDelete}
          onEdit={onEdit}
          subfield={child}
        />
      ))}
    </>
  );
}

export function ColumnSubfields({
  accountId,
  databaseId,
  versionId,
  tableId,
  column,
  columnTypes,
}: {
  accountId: string;
  databaseId: string;
  versionId: string;
  tableId: string;
  column: Column;
  columnTypes: ColumnTypeLookup;
}) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [edit, setEdit] = useState<SubfieldEdit | null>(null);

  const path = {
    account_id: accountId,
    database_id: databaseId,
    database_version_id: versionId,
    database_table_id: tableId,
    database_table_column_id: column.id,
  };

  const subfieldsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/columns/{database_table_column_id}/subfields",
    { params: { path } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/columns/{database_table_column_id}/subfields/{database_table_column_subfield_id}",
    { meta: { successMessage: t`Sous-champ supprimé` } }
  );

  const subfields = [...(subfieldsQuery.data?.items ?? [])].sort(
    (a, b) => a.rank - b.rank
  );
  const byParent = new Map<string | null, Subfield[]>();
  for (const subfield of subfields) {
    const key = subfield.parentSubfieldId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(subfield);
    byParent.set(key, list);
  }
  const roots = byParent.get(null) ?? [];

  async function remove(subfield: Subfield) {
    await deleteMutation.mutateAsync({
      params: {
        path: { ...path, database_table_column_subfield_id: subfield.id },
      },
    });
    queryClient.invalidateQueries({ queryKey: SUBFIELDS_KEY });
    queryClient.invalidateQueries({ queryKey: TABLES_KEY });
  }

  return (
    <Flex
      gap={8}
      style={{
        background: "var(--ant-color-fill-quaternary)",
        borderRadius: 4,
        marginInlineStart: 22,
        padding: 12,
      }}
      vertical
    >
      <Typography.Text
        strong
      >{t`Sous-champs de ${column.name}`}</Typography.Text>

      {roots.length === 0 ? (
        <Empty
          description={t`Aucun sous-champ`}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <Flex gap={6} vertical>
          {roots.map((subfield) => (
            <SubfieldRow
              byParent={byParent}
              childSubfields={byParent.get(subfield.id) ?? []}
              columnTypes={columnTypes}
              depth={0}
              key={subfield.id}
              onAddChild={(parentId, nextRank) =>
                setEdit({ parentSubfieldId: parentId, nextRank })
              }
              onDelete={remove}
              onEdit={(target) =>
                setEdit({
                  subfield: target,
                  parentSubfieldId: target.parentSubfieldId ?? null,
                  nextRank: target.rank,
                })
              }
              subfield={subfield}
            />
          ))}
        </Flex>
      )}

      <Flex>
        <Button
          icon={<PlusOutlined />}
          onClick={() =>
            setEdit({ parentSubfieldId: null, nextRank: roots.length })
          }
          size="small"
        >
          {t`Ajouter un sous-champ`}
        </Button>
      </Flex>

      {edit ? (
        <SubfieldFormModal
          accountId={accountId}
          columnId={column.id}
          columnTypes={columnTypes}
          databaseId={databaseId}
          key={edit.subfield?.id ?? `create:${edit.parentSubfieldId ?? "root"}`}
          nextRank={edit.nextRank}
          onClose={() => setEdit(null)}
          open
          parentSubfieldId={edit.parentSubfieldId}
          subfield={edit.subfield}
          tableId={tableId}
          versionId={versionId}
        />
      ) : null}
    </Flex>
  );
}
