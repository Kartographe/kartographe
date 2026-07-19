// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import { z } from "zod";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { dtoEnums } from "@/api/generated/schema.enums";
import { INDEX_TYPE_LABELS } from "@/features/databases/tables/labels";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";
import { asRichText, isRichTextEmpty } from "@/lib/rich-text/rich-text";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

type DatabaseTable = components["schemas"]["DatabaseTableItem"];
type Index = components["schemas"]["DatabaseTableIndexItem"];
type IndexType = components["schemas"]["IndexType"];

const INDEXES_KEY = [
  "get",
  "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/indexes",
];

interface IndexFormModalProps {
  accountId: string;
  databaseId: string;
  versionId: string;
  table: DatabaseTable;
  index?: Index;
  nextRank: number;
  open: boolean;
  onClose: () => void;
}

export function IndexFormModal({
  accountId,
  databaseId,
  versionId,
  table,
  index,
  nextRank,
  open,
  onClose,
}: IndexFormModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const isEdit = !!index;
  const path = {
    account_id: accountId,
    database_id: databaseId,
    database_version_id: versionId,
    database_table_id: table.id,
  };

  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/indexes",
    { meta: { successMessage: t`Index créé`, noErrorToast: true } }
  );
  const updateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/indexes/{database_table_index_id}",
    { meta: { successMessage: t`Index mis à jour`, noErrorToast: true } }
  );

  const form = useAppForm({
    defaultValues: {
      name: index?.name ?? "",
      type: (index?.type ?? "btree") as IndexType,
      unique: index?.unique ?? false,
      columnIds: index?.columnIds ?? [],
      expression: index?.expression ?? "",
      whereClause: index?.whereClause ?? "",
      description: asRichText(index?.description),
    },
    validators: {
      onSubmit: z
        .object({
          name: z.string().min(1, t`Le nom est requis`),
          type: z.enum(dtoEnums.IndexType),
          unique: z.boolean(),
          columnIds: z.array(z.string()),
          expression: z.string(),
          whereClause: z.string(),
          description: z.record(z.string(), z.unknown()),
        })
        .refine(
          (value) => value.columnIds.length > 0 || value.expression.trim(),
          {
            message: t`Indiquez au moins une colonne ou une expression`,
            path: ["columnIds"],
          }
        ),
    },
    onSubmit: async ({ value, formApi }) => {
      const body = {
        name: value.name,
        type: value.type,
        unique: value.unique,
        columnIds: value.columnIds,
        expression: value.expression.trim() || null,
        whereClause: value.whereClause || null,
        rank: index?.rank ?? nextRank,
        description: isRichTextEmpty(value.description)
          ? null
          : (value.description as RichTextDocument),
      };
      try {
        if (index) {
          await updateMutation.mutateAsync({
            params: { path: { ...path, database_table_index_id: index.id } },
            body,
          });
        } else {
          await createMutation.mutateAsync({ params: { path }, body });
        }
        queryClient.invalidateQueries({ queryKey: INDEXES_KEY });
        formApi.reset();
        onClose();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  const typeOptions = dtoEnums.IndexType.map((value) => ({
    value,
    label: t(INDEX_TYPE_LABELS[value]),
  }));
  const columnOptions = (table.columns ?? []).map((column) => ({
    value: column.id,
    label: column.name,
  }));

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={isEdit ? t`Modifier l'index` : t`Créer un index`}
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="name">
            {(field) => (
              <field.TextField label={t`Nom`} placeholder="idx_users_email" />
            )}
          </form.AppField>
          <form.AppField name="type">
            {(field) => (
              <field.SelectField label={t`Type`} options={typeOptions} />
            )}
          </form.AppField>
          <form.AppField name="unique">
            {(field) => <field.CheckboxField>{t`Unique`}</field.CheckboxField>}
          </form.AppField>
          <form.AppField name="columnIds">
            {(field) => (
              <field.MultiSelectField
                label={t`Colonnes`}
                options={columnOptions}
                placeholder={t`Colonnes indexées (ou une expression ci-dessous)`}
              />
            )}
          </form.AppField>
          <form.AppField name="expression">
            {(field) => (
              <field.TextField
                label={t`Expression`}
                placeholder={t`Index d'expression, ex. (aem_file ->> 'fileId')`}
              />
            )}
          </form.AppField>
          <form.AppField name="whereClause">
            {(field) => (
              <field.TextField
                label={t`Clause WHERE`}
                placeholder={t`Index partiel, ex. deleted_at IS NULL`}
              />
            )}
          </form.AppField>
          <form.AppField name="description">
            {(field) => (
              <field.RichTextField
                label={t`Description`}
                placeholder={t`À quoi sert cet index ?`}
              />
            )}
          </form.AppField>
          <form.SubmitButton block>
            {isEdit ? t`Enregistrer` : t`Créer l'index`}
          </form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
