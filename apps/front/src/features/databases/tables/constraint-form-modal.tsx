// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { useStore } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import { z } from "zod";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { dtoEnums } from "@/api/generated/schema.enums";
import {
  CONSTRAINT_TYPE_LABELS,
  REFERENTIAL_ACTION_LABELS,
} from "@/features/databases/tables/labels";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";
import { asRichText, isRichTextEmpty } from "@/lib/rich-text/rich-text";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

type DatabaseTable = components["schemas"]["DatabaseTableItem"];
type Constraint = components["schemas"]["DatabaseTableConstraintItem"];
type ConstraintType = components["schemas"]["ConstraintType"];
type ReferentialAction = components["schemas"]["ReferentialAction"];

/** Empty string is how a select spells the API's `null`. */
const NONE = "";

const CONSTRAINTS_KEY = [
  "get",
  "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/constraints",
];

interface ConstraintFormModalProps {
  accountId: string;
  databaseId: string;
  versionId: string;
  table: DatabaseTable;
  /** Every table of the version, to offer as a foreign-key target. */
  tables: DatabaseTable[];
  constraint?: Constraint;
  nextRank: number;
  open: boolean;
  onClose: () => void;
}

export function ConstraintFormModal({
  accountId,
  databaseId,
  versionId,
  table,
  tables,
  constraint,
  nextRank,
  open,
  onClose,
}: ConstraintFormModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const isEdit = !!constraint;
  const path = {
    account_id: accountId,
    database_id: databaseId,
    database_version_id: versionId,
    database_table_id: table.id,
  };

  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/constraints",
    { meta: { successMessage: t`Contrainte créée`, noErrorToast: true } }
  );
  const updateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/constraints/{database_table_constraint_id}",
    { meta: { successMessage: t`Contrainte mise à jour`, noErrorToast: true } }
  );

  const form = useAppForm({
    defaultValues: {
      name: constraint?.name ?? "",
      type: (constraint?.type ?? "unique") as ConstraintType,
      columnIds: constraint?.columnIds ?? [],
      checkExpression: constraint?.checkExpression ?? "",
      foreignKeyDatabaseTableId: constraint?.foreignKeyDatabaseTableId ?? NONE,
      foreignKeyColumnIds: constraint?.foreignKeyColumnIds ?? [],
      onDelete: (constraint?.onDelete ?? NONE) as ReferentialAction | "",
      onUpdate: (constraint?.onUpdate ?? NONE) as ReferentialAction | "",
      description: asRichText(constraint?.description),
    },
    validators: {
      onSubmit: z.object({
        name: z.string().min(1, t`Le nom est requis`),
        type: z.enum(dtoEnums.ConstraintType),
        columnIds: z.array(z.string()),
        checkExpression: z.string(),
        foreignKeyDatabaseTableId: z.string(),
        foreignKeyColumnIds: z.array(z.string()),
        onDelete: z.union([z.literal(""), z.enum(dtoEnums.ReferentialAction)]),
        onUpdate: z.union([z.literal(""), z.enum(dtoEnums.ReferentialAction)]),
        description: z.record(z.string(), z.unknown()),
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      const isForeignKey = value.type === "foreign_key";
      const body = {
        name: value.name,
        type: value.type,
        columnIds: value.columnIds,
        checkExpression: value.checkExpression || null,
        // Foreign-key details only travel with a foreign-key constraint.
        foreignKeyDatabaseTableId: isForeignKey
          ? value.foreignKeyDatabaseTableId || null
          : null,
        foreignKeyColumnIds: isForeignKey ? value.foreignKeyColumnIds : [],
        onDelete: isForeignKey ? value.onDelete || null : null,
        onUpdate: isForeignKey ? value.onUpdate || null : null,
        rank: constraint?.rank ?? nextRank,
        description: isRichTextEmpty(value.description)
          ? null
          : (value.description as RichTextDocument),
      };
      try {
        if (constraint) {
          await updateMutation.mutateAsync({
            params: {
              path: { ...path, database_table_constraint_id: constraint.id },
            },
            body,
          });
        } else {
          await createMutation.mutateAsync({ params: { path }, body });
        }
        queryClient.invalidateQueries({ queryKey: CONSTRAINTS_KEY });
        formApi.reset();
        onClose();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  const type = useStore(form.store, (state) => state.values.type);
  const fkTableId = useStore(
    form.store,
    (state) => state.values.foreignKeyDatabaseTableId
  );
  const fkTable = tables.find((candidate) => candidate.id === fkTableId);
  const isForeignKey = type === "foreign_key";

  const typeOptions = dtoEnums.ConstraintType.map((value) => ({
    value,
    label: t(CONSTRAINT_TYPE_LABELS[value]),
  }));
  const columnOptions = (table.columns ?? []).map((column) => ({
    value: column.id,
    label: column.name,
  }));
  const fkTableOptions = [
    { value: NONE, label: t`Aucune` },
    ...tables.map((candidate) => ({
      value: candidate.id,
      label: `${candidate.schema}.${candidate.name}`,
    })),
  ];
  const fkColumnOptions = (fkTable?.columns ?? []).map((column) => ({
    value: column.id,
    label: column.name,
  }));
  const actionOptions = [
    { value: NONE, label: t`Par défaut` },
    ...dtoEnums.ReferentialAction.map((value) => ({
      value,
      label: t(REFERENTIAL_ACTION_LABELS[value]),
    })),
  ];

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={isEdit ? t`Modifier la contrainte` : t`Créer une contrainte`}
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="name">
            {(field) => (
              <field.TextField label={t`Nom`} placeholder="uq_users_email" />
            )}
          </form.AppField>
          <form.AppField name="type">
            {(field) => (
              <field.SelectField label={t`Type`} options={typeOptions} />
            )}
          </form.AppField>
          <form.AppField name="columnIds">
            {(field) => (
              <field.MultiSelectField
                label={t`Colonnes`}
                options={columnOptions}
                placeholder={t`Colonnes concernées`}
              />
            )}
          </form.AppField>
          {type === "check" ? (
            <form.AppField name="checkExpression">
              {(field) => (
                <field.TextField
                  label={t`Expression de vérification`}
                  placeholder="age >= 0"
                />
              )}
            </form.AppField>
          ) : null}

          {isForeignKey ? (
            <>
              <form.AppField name="foreignKeyDatabaseTableId">
                {(field) => (
                  <field.SelectField
                    label={t`Table référencée`}
                    onChange={() => {
                      form.setFieldValue("foreignKeyColumnIds", []);
                    }}
                    options={fkTableOptions}
                  />
                )}
              </form.AppField>
              <form.AppField name="foreignKeyColumnIds">
                {(field) => (
                  <field.MultiSelectField
                    disabled={!fkTable}
                    label={t`Colonnes référencées`}
                    options={fkColumnOptions}
                  />
                )}
              </form.AppField>
              <form.AppField name="onDelete">
                {(field) => (
                  <field.SelectField
                    label={t`À la suppression`}
                    options={actionOptions}
                  />
                )}
              </form.AppField>
              <form.AppField name="onUpdate">
                {(field) => (
                  <field.SelectField
                    label={t`À la mise à jour`}
                    options={actionOptions}
                  />
                )}
              </form.AppField>
            </>
          ) : null}

          <form.AppField name="description">
            {(field) => (
              <field.RichTextField
                label={t`Description`}
                placeholder={t`À quoi sert cette contrainte ?`}
              />
            )}
          </form.AppField>
          <form.SubmitButton block>
            {isEdit ? t`Enregistrer` : t`Créer la contrainte`}
          </form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
