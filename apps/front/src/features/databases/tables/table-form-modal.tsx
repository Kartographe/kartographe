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
import {
  IDENTIFIER_MAX_LENGTH,
  IDENTIFIER_PATTERN,
} from "@/features/databases/identifier";
import { TABLE_TYPE_LABELS } from "@/features/databases/labels";
import { TagsField } from "@/features/tags/tags-field";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";
import { asRichText, isRichTextEmpty } from "@/lib/rich-text/rich-text";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

type DatabaseTable = components["schemas"]["DatabaseTableItem"];
type TableType = components["schemas"]["DatabaseTableType"];

interface TableFormModalProps {
  accountId: string;
  databaseId: string;
  versionId: string;
  table?: DatabaseTable;
  open: boolean;
  onClose: () => void;
}

export function TableFormModal({
  accountId,
  databaseId,
  versionId,
  table,
  open,
  onClose,
}: TableFormModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const isEdit = !!table;
  const path = {
    account_id: accountId,
    database_id: databaseId,
    database_version_id: versionId,
  };

  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables",
    { meta: { successMessage: t`Table créée`, noErrorToast: true } }
  );
  const updateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}",
    { meta: { successMessage: t`Table mise à jour`, noErrorToast: true } }
  );

  const form = useAppForm({
    defaultValues: {
      schema: table?.schema ?? "public",
      name: table?.name ?? "",
      type: (table?.type ?? "physical") as TableType,
      color: table?.color ?? "",
      tagIds: table?.tagIds ?? [],
      description: asRichText(table?.description),
    },
    validators: {
      onSubmit: z.object({
        // A schema is an unquoted identifier too, not free text.
        schema: z
          .string()
          .min(1, t`Le schéma est requis`)
          .max(IDENTIFIER_MAX_LENGTH, t`Le schéma est trop long`)
          .regex(
            IDENTIFIER_PATTERN,
            t`Lettres, chiffres et tirets bas uniquement, ne commençant pas par un chiffre`
          ),
        name: z
          .string()
          .min(1, t`Le nom est requis`)
          .max(IDENTIFIER_MAX_LENGTH, t`Le nom est trop long`)
          .regex(
            IDENTIFIER_PATTERN,
            t`Lettres, chiffres et tirets bas uniquement, ne commençant pas par un chiffre`
          ),
        type: z.enum(dtoEnums.DatabaseTableType),
        color: z.string(),
        tagIds: z.array(z.string()),
        description: z.record(z.string(), z.unknown()),
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      // `columns` is omitted on purpose: they are managed through their own
      // endpoints, and sending the key would replace the whole set.
      const body = {
        schema: value.schema,
        name: value.name,
        type: value.type,
        color: value.color || null,
        tagIds: value.tagIds,
        description: isRichTextEmpty(value.description)
          ? null
          : (value.description as RichTextDocument),
      };
      try {
        if (table) {
          await updateMutation.mutateAsync({
            params: { path: { ...path, database_table_id: table.id } },
            body,
          });
        } else {
          await createMutation.mutateAsync({ params: { path }, body });
        }
        queryClient.invalidateQueries({
          queryKey: [
            "get",
            "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables",
          ],
        });
        formApi.reset();
        onClose();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  const typeOptions = dtoEnums.DatabaseTableType.map((value) => ({
    value,
    label: t(TABLE_TYPE_LABELS[value]),
  }));

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={isEdit ? t`Modifier la table` : t`Créer une table`}
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="schema">
            {(field) => (
              <field.TextField label={t`Schéma`} placeholder="public" />
            )}
          </form.AppField>
          <form.AppField name="name">
            {(field) => <field.TextField label={t`Nom`} placeholder="users" />}
          </form.AppField>
          <form.AppField name="type">
            {(field) => (
              <field.SelectField label={t`Type`} options={typeOptions} />
            )}
          </form.AppField>
          <form.AppField name="color">
            {(field) => <field.ColorField label={t`Couleur`} />}
          </form.AppField>
          <form.AppField name="tagIds">
            {(field) => (
              <TagsField
                accountId={accountId}
                entityType="database_table"
                onChange={field.handleChange}
                value={field.state.value}
              />
            )}
          </form.AppField>
          <form.AppField name="description">
            {(field) => (
              <field.RichTextField
                label={t`Description`}
                placeholder={t`Que contient cette table ?`}
              />
            )}
          </form.AppField>
          <form.SubmitButton block>
            {isEdit ? t`Enregistrer` : t`Créer la table`}
          </form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
