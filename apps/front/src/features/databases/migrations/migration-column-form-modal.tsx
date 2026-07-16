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
import { MIGRATION_COLUMN_TYPE_LABELS } from "@/features/databases/labels";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";
import { asRichText, isRichTextEmpty } from "@/lib/rich-text/rich-text";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

type DatabaseMigration = components["schemas"]["DatabaseMigrationItem"];
type MigrationColumn = components["schemas"]["DatabaseMigrationColumnItem"];
type MigrationColumnType = components["schemas"]["DatabaseMigrationColumnType"];
type DatabaseTable = components["schemas"]["DatabaseTableItem"];

const COLUMN_TYPES: MigrationColumnType[] = [
  "migration",
  "deletion",
  "creation",
];
const TRANSFORMATION_MAX_LENGTH = 1024;

/** Empty string is how a select spells the API's `null`. */
const NONE = "";

/** A deletion leaves a source; a creation lands on a destination; a migration does both. */
function usesSource(type: MigrationColumnType) {
  return type === "migration" || type === "deletion";
}
function usesDestination(type: MigrationColumnType) {
  return type === "migration" || type === "creation";
}

interface MigrationColumnFormModalProps {
  accountId: string;
  databaseId: string;
  migration: DatabaseMigration;
  column?: MigrationColumn;
  open: boolean;
  onClose: () => void;
}

export function MigrationColumnFormModal({
  accountId,
  databaseId,
  migration,
  column,
  open,
  onClose,
}: MigrationColumnFormModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const isEdit = !!column;
  const path = {
    account_id: accountId,
    database_id: databaseId,
    database_migration_id: migration.id,
  };

  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/databases/{database_id}/migrations/{database_migration_id}/columns",
    { meta: { successMessage: t`Étape créée`, noErrorToast: true } }
  );
  const updateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/databases/{database_id}/migrations/{database_migration_id}/columns/{database_migration_column_id}",
    { meta: { successMessage: t`Étape mise à jour`, noErrorToast: true } }
  );

  // Endpoints are constrained to the versions the migration joins: sources must
  // live in its source version, destinations in its destination version.
  const sourceTablesQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables",
    {
      params: {
        path: {
          account_id: accountId,
          database_id: migration.sourceDatabaseId,
          database_version_id: migration.sourceDatabaseVersionId,
        },
      },
    }
  );
  const destinationTablesQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables",
    {
      params: {
        path: {
          account_id: accountId,
          database_id: migration.destinationDatabaseId,
          database_version_id: migration.destinationDatabaseVersionId,
        },
      },
    }
  );

  const form = useAppForm({
    defaultValues: {
      type: column?.type ?? ("migration" as MigrationColumnType),
      sourceDatabaseTableId: column?.sourceDatabaseTableId ?? NONE,
      sourceDatabaseTableColumnId: column?.sourceDatabaseTableColumnId ?? NONE,
      destinationDatabaseTableId: column?.destinationDatabaseTableId ?? NONE,
      destinationDatabaseTableColumnId:
        column?.destinationDatabaseTableColumnId ?? NONE,
      transformationMethod: column?.transformationMethod ?? "",
      description: asRichText(column?.description),
    },
    validators: {
      onSubmit: z
        .object({
          type: z.enum(COLUMN_TYPES),
          sourceDatabaseTableId: z.string(),
          sourceDatabaseTableColumnId: z.string(),
          destinationDatabaseTableId: z.string(),
          destinationDatabaseTableColumnId: z.string(),
          transformationMethod: z
            .string()
            .max(
              TRANSFORMATION_MAX_LENGTH,
              t`La transformation est trop longue`
            ),
          description: z.record(z.string(), z.unknown()),
        })
        // The endpoints a step needs are the ones its type reads — the API only
        // checks that what is sent exists, not that it is enough.
        .superRefine((value, ctx) => {
          if (usesSource(value.type)) {
            if (!value.sourceDatabaseTableId) {
              ctx.addIssue({
                code: "custom",
                path: ["sourceDatabaseTableId"],
                message: t`La table source est requise`,
              });
            }
            if (!value.sourceDatabaseTableColumnId) {
              ctx.addIssue({
                code: "custom",
                path: ["sourceDatabaseTableColumnId"],
                message: t`La colonne source est requise`,
              });
            }
          }
          if (usesDestination(value.type)) {
            if (!value.destinationDatabaseTableId) {
              ctx.addIssue({
                code: "custom",
                path: ["destinationDatabaseTableId"],
                message: t`La table de destination est requise`,
              });
            }
            if (!value.destinationDatabaseTableColumnId) {
              ctx.addIssue({
                code: "custom",
                path: ["destinationDatabaseTableColumnId"],
                message: t`La colonne de destination est requise`,
              });
            }
          }
        }),
    },
    onSubmit: async ({ value, formApi }) => {
      // Drop the side the type does not read, so switching type mid-form never
      // ships an endpoint from the abandoned shape.
      const source = usesSource(value.type);
      const destination = usesDestination(value.type);
      const body = {
        type: value.type,
        sourceDatabaseTableId: source ? value.sourceDatabaseTableId : null,
        sourceDatabaseTableColumnId: source
          ? value.sourceDatabaseTableColumnId
          : null,
        destinationDatabaseTableId: destination
          ? value.destinationDatabaseTableId
          : null,
        destinationDatabaseTableColumnId: destination
          ? value.destinationDatabaseTableColumnId
          : null,
        transformationMethod: value.transformationMethod || null,
        description: isRichTextEmpty(value.description)
          ? null
          : (value.description as RichTextDocument),
      };
      try {
        if (column) {
          await updateMutation.mutateAsync({
            params: {
              path: { ...path, database_migration_column_id: column.id },
            },
            body,
          });
        } else {
          await createMutation.mutateAsync({ params: { path }, body });
        }
        queryClient.invalidateQueries({
          queryKey: [
            "get",
            "/v1/accounts/{account_id}/databases/{database_id}/migrations/{database_migration_id}/columns",
          ],
        });
        formApi.reset();
        onClose();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  const type = useStore(form.store, (state) => state.values.type);
  const sourceTableId = useStore(
    form.store,
    (state) => state.values.sourceDatabaseTableId
  );
  const destinationTableId = useStore(
    form.store,
    (state) => state.values.destinationDatabaseTableId
  );

  const sourceTables = sourceTablesQuery.data?.items ?? [];
  const destinationTables = destinationTablesQuery.data?.items ?? [];
  const sourceTable = sourceTables.find(
    (candidate) => candidate.id === sourceTableId
  );
  const destinationTable = destinationTables.find(
    (candidate) => candidate.id === destinationTableId
  );

  function tableOptions(tables: DatabaseTable[]) {
    return tables.map((table) => ({
      value: table.id,
      label: `${table.schema}.${table.name}`,
    }));
  }
  function columnOptions(table: DatabaseTable | undefined) {
    return (table?.columns ?? []).map((candidate) => ({
      value: candidate.id,
      label: candidate.name,
    }));
  }

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={isEdit ? t`Modifier l'étape` : t`Ajouter une étape`}
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="type">
            {(field) => (
              <field.SelectField
                label={t`Type`}
                options={COLUMN_TYPES.map((candidate) => ({
                  value: candidate,
                  label: t(MIGRATION_COLUMN_TYPE_LABELS[candidate]),
                }))}
              />
            )}
          </form.AppField>

          {usesSource(type) ? (
            <>
              <form.AppField name="sourceDatabaseTableId">
                {(field) => (
                  <field.SelectField
                    label={t`Table source`}
                    loading={sourceTablesQuery.isLoading}
                    onChange={() => {
                      form.setFieldValue("sourceDatabaseTableColumnId", NONE);
                    }}
                    options={tableOptions(sourceTables)}
                  />
                )}
              </form.AppField>
              <form.AppField name="sourceDatabaseTableColumnId">
                {(field) => (
                  <field.SelectField
                    disabled={!sourceTable}
                    label={t`Colonne source`}
                    options={columnOptions(sourceTable)}
                  />
                )}
              </form.AppField>
            </>
          ) : null}

          {usesDestination(type) ? (
            <>
              <form.AppField name="destinationDatabaseTableId">
                {(field) => (
                  <field.SelectField
                    label={t`Table de destination`}
                    loading={destinationTablesQuery.isLoading}
                    onChange={() => {
                      form.setFieldValue(
                        "destinationDatabaseTableColumnId",
                        NONE
                      );
                    }}
                    options={tableOptions(destinationTables)}
                  />
                )}
              </form.AppField>
              <form.AppField name="destinationDatabaseTableColumnId">
                {(field) => (
                  <field.SelectField
                    disabled={!destinationTable}
                    label={t`Colonne de destination`}
                    options={columnOptions(destinationTable)}
                  />
                )}
              </form.AppField>
            </>
          ) : null}

          {type === "migration" ? (
            <form.AppField name="transformationMethod">
              {(field) => (
                <field.TextAreaField
                  label={t`Transformation`}
                  placeholder={t`LOWER(email)`}
                />
              )}
            </form.AppField>
          ) : null}

          <form.AppField name="description">
            {(field) => (
              <field.RichTextField
                label={t`Description`}
                placeholder={t`Pourquoi cette étape ?`}
              />
            )}
          </form.AppField>
          <form.SubmitButton block>
            {isEdit ? t`Enregistrer` : t`Ajouter l'étape`}
          </form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
