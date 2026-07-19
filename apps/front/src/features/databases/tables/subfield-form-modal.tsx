// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import { z } from "zod";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import {
  IDENTIFIER_MAX_LENGTH,
  IDENTIFIER_PATTERN,
} from "@/features/databases/identifier";
import type { ColumnTypeLookup } from "@/features/databases/use-column-types";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";
import { asRichText, isRichTextEmpty } from "@/lib/rich-text/rich-text";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

type Subfield = components["schemas"]["DatabaseTableColumnSubfieldItem"];

const TABLES_KEY = [
  "get",
  "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables",
];
const SUBFIELDS_KEY = [
  "get",
  "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/columns/{database_table_column_id}/subfields",
];

interface SubfieldFormModalProps {
  accountId: string;
  databaseId: string;
  versionId: string;
  tableId: string;
  columnId: string;
  columnTypes: ColumnTypeLookup;
  /** The sub-field being edited, if any. */
  subfield?: Subfield;
  /** The parent to nest a new sub-field under (top-level when null). */
  parentSubfieldId: string | null;
  /** Position given to a newly-created sub-field. */
  nextRank: number;
  open: boolean;
  onClose: () => void;
}

export function SubfieldFormModal({
  accountId,
  databaseId,
  versionId,
  tableId,
  columnId,
  columnTypes,
  subfield,
  parentSubfieldId,
  nextRank,
  open,
  onClose,
}: SubfieldFormModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const isEdit = !!subfield;
  const path = {
    account_id: accountId,
    database_id: databaseId,
    database_version_id: versionId,
    database_table_id: tableId,
    database_table_column_id: columnId,
  };

  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/columns/{database_table_column_id}/subfields",
    { meta: { successMessage: t`Sous-champ créé`, noErrorToast: true } }
  );
  const updateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/columns/{database_table_column_id}/subfields/{database_table_column_subfield_id}",
    { meta: { successMessage: t`Sous-champ mis à jour`, noErrorToast: true } }
  );

  const form = useAppForm({
    defaultValues: {
      name: subfield?.name ?? "",
      databaseColumnTypeId: subfield?.databaseColumnTypeId ?? "",
      nullable: subfield?.nullable ?? false,
      description: asRichText(subfield?.description),
    },
    validators: {
      onSubmit: z.object({
        name: z
          .string()
          .min(1, t`Le nom est requis`)
          .max(IDENTIFIER_MAX_LENGTH, t`Le nom est trop long`)
          .regex(
            IDENTIFIER_PATTERN,
            t`Lettres, chiffres et tirets bas uniquement, ne commençant pas par un chiffre`
          ),
        databaseColumnTypeId: z.string().min(1, t`Le type est requis`),
        nullable: z.boolean(),
        description: z.record(z.string(), z.unknown()),
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      const body = {
        name: value.name,
        databaseColumnTypeId: value.databaseColumnTypeId,
        nullable: value.nullable,
        rank: subfield?.rank ?? nextRank,
        parentSubfieldId,
        description: isRichTextEmpty(value.description)
          ? null
          : (value.description as RichTextDocument),
      };
      try {
        if (subfield) {
          await updateMutation.mutateAsync({
            params: {
              path: { ...path, database_table_column_subfield_id: subfield.id },
            },
            body,
          });
        } else {
          await createMutation.mutateAsync({ params: { path }, body });
        }
        queryClient.invalidateQueries({ queryKey: SUBFIELDS_KEY });
        queryClient.invalidateQueries({ queryKey: TABLES_KEY });
        formApi.reset();
        onClose();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={isEdit ? t`Modifier le sous-champ` : t`Ajouter un sous-champ`}
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="name">
            {(field) => <field.TextField label={t`Nom`} placeholder="street" />}
          </form.AppField>
          <form.AppField name="databaseColumnTypeId">
            {(field) => (
              <field.SelectField
                label={t`Type`}
                loading={columnTypes.isLoading}
                options={columnTypes.options}
              />
            )}
          </form.AppField>
          <form.AppField name="nullable">
            {(field) => (
              <field.CheckboxField>{t`Nullable`}</field.CheckboxField>
            )}
          </form.AppField>
          <form.AppField name="description">
            {(field) => (
              <field.RichTextField
                label={t`Description`}
                placeholder={t`Que contient ce sous-champ ?`}
              />
            )}
          </form.AppField>
          <form.SubmitButton block>
            {isEdit ? t`Enregistrer` : t`Ajouter le sous-champ`}
          </form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
