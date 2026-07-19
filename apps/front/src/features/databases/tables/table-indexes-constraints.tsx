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
import { ConstraintFormModal } from "@/features/databases/tables/constraint-form-modal";
import {
  ConstraintTypeTag,
  IndexTypeTag,
} from "@/features/databases/tables/index-constraint-tags";
import { IndexFormModal } from "@/features/databases/tables/index-form-modal";

type DatabaseTable = components["schemas"]["DatabaseTableItem"];
type Index = components["schemas"]["DatabaseTableIndexItem"];
type Constraint = components["schemas"]["DatabaseTableConstraintItem"];

const INDEXES_KEY = [
  "get",
  "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/indexes",
];
const CONSTRAINTS_KEY = [
  "get",
  "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/constraints",
];

export function TableIndexesConstraints({
  accountId,
  databaseId,
  versionId,
  table,
  tables,
}: {
  accountId: string;
  databaseId: string;
  versionId: string;
  table: DatabaseTable;
  tables: DatabaseTable[];
}) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [indexForm, setIndexForm] = useState<Index | undefined | null>(null);
  const [constraintForm, setConstraintForm] = useState<
    Constraint | undefined | null
  >(null);

  const path = {
    account_id: accountId,
    database_id: databaseId,
    database_version_id: versionId,
    database_table_id: table.id,
  };
  const locked = table.locked;

  const indexesQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/indexes",
    { params: { path } }
  );
  const constraintsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/constraints",
    { params: { path } }
  );
  const deleteIndexMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/indexes/{database_table_index_id}",
    { meta: { successMessage: t`Index supprimé` } }
  );
  const deleteConstraintMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/constraints/{database_table_constraint_id}",
    { meta: { successMessage: t`Contrainte supprimée` } }
  );

  const indexes = [...(indexesQuery.data?.items ?? [])].sort(
    (a, b) => a.rank - b.rank
  );
  const constraints = [...(constraintsQuery.data?.items ?? [])].sort(
    (a, b) => a.rank - b.rank
  );
  const columnName = (id: string) =>
    (table.columns ?? []).find((column) => column.id === id)?.name ?? id;

  async function removeIndex(index: Index) {
    await deleteIndexMutation.mutateAsync({
      params: { path: { ...path, database_table_index_id: index.id } },
    });
    queryClient.invalidateQueries({ queryKey: INDEXES_KEY });
  }
  async function removeConstraint(constraint: Constraint) {
    await deleteConstraintMutation.mutateAsync({
      params: {
        path: { ...path, database_table_constraint_id: constraint.id },
      },
    });
    queryClient.invalidateQueries({ queryKey: CONSTRAINTS_KEY });
  }

  return (
    <Flex gap={16} vertical>
      <Flex gap={8} vertical>
        <Typography.Text strong>{t`Index`}</Typography.Text>
        {indexes.length === 0 ? (
          <Empty
            description={t`Aucun index`}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Flex gap={8} vertical>
            {indexes.map((index) => (
              <Flex align="center" gap={8} key={index.id}>
                <IndexTypeTag type={index.type} />
                <Typography.Text code style={{ minWidth: 160 }}>
                  {index.name}
                </Typography.Text>
                <Typography.Text style={{ flex: 1 }} type="secondary">
                  {index.columnIds.length > 0
                    ? index.columnIds.map(columnName).join(", ")
                    : null}
                  {index.expression ? (
                    <Typography.Text code>{index.expression}</Typography.Text>
                  ) : null}
                </Typography.Text>
                {index.unique ? <Tag color="gold">{t`Unique`}</Tag> : null}
                <Tooltip title={locked ? t`Table verrouillée` : t`Modifier`}>
                  <Button
                    disabled={locked}
                    icon={<EditOutlined />}
                    onClick={() => setIndexForm(index)}
                    size="small"
                  />
                </Tooltip>
                <Popconfirm
                  cancelText={t`Annuler`}
                  disabled={locked}
                  okButtonProps={{ danger: true }}
                  okText={t`Supprimer`}
                  onConfirm={() => removeIndex(index)}
                  title={t`Supprimer cet index ?`}
                >
                  <Button
                    danger
                    disabled={locked}
                    icon={<DeleteOutlined />}
                    size="small"
                  />
                </Popconfirm>
              </Flex>
            ))}
          </Flex>
        )}
        <Flex>
          <Button
            disabled={locked}
            icon={<PlusOutlined />}
            onClick={() => setIndexForm(undefined)}
            size="small"
          >
            {t`Ajouter un index`}
          </Button>
        </Flex>
      </Flex>

      <Flex gap={8} vertical>
        <Typography.Text strong>{t`Contraintes`}</Typography.Text>
        {constraints.length === 0 ? (
          <Empty
            description={t`Aucune contrainte`}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Flex gap={8} vertical>
            {constraints.map((constraint) => (
              <Flex align="center" gap={8} key={constraint.id}>
                <ConstraintTypeTag type={constraint.type} />
                <Typography.Text code style={{ minWidth: 160 }}>
                  {constraint.name}
                </Typography.Text>
                <Typography.Text style={{ flex: 1 }} type="secondary">
                  {constraint.columnIds.map(columnName).join(", ")}
                </Typography.Text>
                <Tooltip title={locked ? t`Table verrouillée` : t`Modifier`}>
                  <Button
                    disabled={locked}
                    icon={<EditOutlined />}
                    onClick={() => setConstraintForm(constraint)}
                    size="small"
                  />
                </Tooltip>
                <Popconfirm
                  cancelText={t`Annuler`}
                  disabled={locked}
                  okButtonProps={{ danger: true }}
                  okText={t`Supprimer`}
                  onConfirm={() => removeConstraint(constraint)}
                  title={t`Supprimer cette contrainte ?`}
                >
                  <Button
                    danger
                    disabled={locked}
                    icon={<DeleteOutlined />}
                    size="small"
                  />
                </Popconfirm>
              </Flex>
            ))}
          </Flex>
        )}
        <Flex>
          <Button
            disabled={locked}
            icon={<PlusOutlined />}
            onClick={() => setConstraintForm(undefined)}
            size="small"
          >
            {t`Ajouter une contrainte`}
          </Button>
        </Flex>
      </Flex>

      {indexForm === null ? null : (
        <IndexFormModal
          accountId={accountId}
          databaseId={databaseId}
          index={indexForm}
          key={indexForm?.id ?? "create"}
          nextRank={indexes.length}
          onClose={() => setIndexForm(null)}
          open
          table={table}
          versionId={versionId}
        />
      )}

      {constraintForm === null ? null : (
        <ConstraintFormModal
          accountId={accountId}
          constraint={constraintForm}
          databaseId={databaseId}
          key={constraintForm?.id ?? "create"}
          nextRank={constraints.length}
          onClose={() => setConstraintForm(null)}
          open
          table={table}
          tables={tables}
          versionId={versionId}
        />
      )}
    </Flex>
  );
}
