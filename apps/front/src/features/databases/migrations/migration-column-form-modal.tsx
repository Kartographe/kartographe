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
import { useAppForm, withForm } from "@/lib/tanstack/react-form/use-app-form";

type DatabaseMigration = components["schemas"]["DatabaseMigrationItem"];
type MigrationColumn = components["schemas"]["DatabaseMigrationColumnItem"];
type MigrationColumnType = components["schemas"]["DatabaseMigrationColumnType"];
type DatabaseTable = components["schemas"]["DatabaseTableItem"];
type Column = components["schemas"]["DatabaseTableColumnItem"];

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

type TranslateFn = ReturnType<typeof useLingui>["t"];

/**
 * A step must supply the endpoints its type reads. The API only checks that
 * what is sent exists, not that it is enough — so the form enforces presence.
 */
function refineColumnStep(
  value: MigrationColumnValues,
  ctx: z.RefinementCtx,
  t: TranslateFn
) {
  const requirements: { present: boolean; path: string; message: string }[] = [
    {
      present: !usesSource(value.type) || !!value.sourceDatabaseTableId,
      path: "sourceDatabaseTableId",
      message: t`La table source est requise`,
    },
    {
      present: !usesSource(value.type) || !!value.sourceDatabaseTableColumnId,
      path: "sourceDatabaseTableColumnId",
      message: t`La colonne source est requise`,
    },
    {
      present:
        !usesDestination(value.type) || !!value.destinationDatabaseTableId,
      path: "destinationDatabaseTableId",
      message: t`La table de destination est requise`,
    },
    {
      present:
        !usesDestination(value.type) ||
        !!value.destinationDatabaseTableColumnId,
      path: "destinationDatabaseTableColumnId",
      message: t`La colonne de destination est requise`,
    },
  ];
  for (const requirement of requirements) {
    if (!requirement.present) {
      ctx.addIssue({
        code: "custom",
        path: [requirement.path],
        message: requirement.message,
      });
    }
  }
}

/** The flat shape the form edits, before it is split back into API endpoints. */
interface MigrationColumnValues {
  type: MigrationColumnType;
  sourceDatabaseTableId: string;
  sourceDatabaseTableColumnId: string;
  sourceDatabaseTableColumnSubfieldId: string;
  destinationDatabaseTableId: string;
  destinationDatabaseTableColumnId: string;
  destinationDatabaseTableColumnSubfieldId: string;
  transformationMethod: string;
  description: Record<string, unknown>;
}

/**
 * Split the flat form value into the API body, dropping the side the type does
 * not read so switching type mid-form never ships an abandoned endpoint.
 */
function buildColumnBody(value: MigrationColumnValues) {
  const source = usesSource(value.type);
  const destination = usesDestination(value.type);
  return {
    type: value.type,
    sourceDatabaseTableId: source ? value.sourceDatabaseTableId : null,
    sourceDatabaseTableColumnId: source
      ? value.sourceDatabaseTableColumnId
      : null,
    sourceDatabaseTableColumnSubfieldId: source
      ? value.sourceDatabaseTableColumnSubfieldId || null
      : null,
    destinationDatabaseTableId: destination
      ? value.destinationDatabaseTableId
      : null,
    destinationDatabaseTableColumnId: destination
      ? value.destinationDatabaseTableColumnId
      : null,
    destinationDatabaseTableColumnSubfieldId: destination
      ? value.destinationDatabaseTableColumnSubfieldId || null
      : null,
    transformationMethod: value.transformationMethod || null,
    description: isRichTextEmpty(value.description)
      ? null
      : (value.description as RichTextDocument),
  };
}

interface SelectOption {
  value: string;
  label: string;
}

function hasSubfields(column: Column | undefined): boolean {
  return (column?.subfields ?? []).length > 0;
}

function tableOptions(tables: DatabaseTable[]): SelectOption[] {
  return tables.map((table) => ({
    value: table.id,
    label: `${table.schema}.${table.name}`,
  }));
}
function columnOptions(table: DatabaseTable | undefined): SelectOption[] {
  return (table?.columns ?? []).map((candidate) => ({
    value: candidate.id,
    label: candidate.name,
  }));
}
// A JSON column resolves its sub-fields on read; offer them as an optional
// finer-grained mapping target.
function subfieldOptions(
  column: Column | undefined,
  noneLabel: string
): SelectOption[] {
  return [
    { value: NONE, label: noneLabel },
    ...(column?.subfields ?? []).map((candidate) => ({
      value: candidate.id,
      label: candidate.name,
    })),
  ];
}

/** Only the string-valued fields, so a reset can safely write `""`. */
type StringField =
  | "sourceDatabaseTableId"
  | "sourceDatabaseTableColumnId"
  | "sourceDatabaseTableColumnSubfieldId"
  | "destinationDatabaseTableId"
  | "destinationDatabaseTableColumnId"
  | "destinationDatabaseTableColumnSubfieldId";

/**
 * One side of the mapping — its table, its column, and (for a JSON column) its
 * optional sub-field. Extracted so the modal stays readable; the field names
 * and labels differ between the source and destination sides.
 */
const MigrationSideFields = withForm({
  defaultValues: {} as MigrationColumnValues,
  props: {
    tableField: "sourceDatabaseTableId" as StringField,
    columnField: "sourceDatabaseTableColumnId" as StringField,
    subfieldField: "sourceDatabaseTableColumnSubfieldId" as StringField,
    tableLabel: "",
    columnLabel: "",
    subfieldLabel: "",
    loading: false,
    columnDisabled: false,
    showSubfield: false,
    tableOptions: [] as SelectOption[],
    columnOptions: [] as SelectOption[],
    subfieldOptions: [] as SelectOption[],
  },
  render: ({
    form,
    tableField,
    columnField,
    subfieldField,
    tableLabel,
    columnLabel,
    subfieldLabel,
    loading,
    columnDisabled,
    showSubfield,
    tableOptions,
    columnOptions,
    subfieldOptions,
  }) => (
    <>
      <form.AppField name={tableField}>
        {(field) => (
          <field.SelectField
            label={tableLabel}
            loading={loading}
            onChange={() => form.setFieldValue(columnField, "")}
            options={tableOptions}
          />
        )}
      </form.AppField>
      <form.AppField name={columnField}>
        {(field) => (
          <field.SelectField
            disabled={columnDisabled}
            label={columnLabel}
            onChange={() => form.setFieldValue(subfieldField, "")}
            options={columnOptions}
          />
        )}
      </form.AppField>
      {showSubfield ? (
        <form.AppField name={subfieldField}>
          {(field) => (
            <field.SelectField
              label={subfieldLabel}
              options={subfieldOptions}
            />
          )}
        </form.AppField>
      ) : null}
    </>
  ),
});

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
      sourceDatabaseTableColumnSubfieldId:
        column?.sourceDatabaseTableColumnSubfieldId ?? NONE,
      destinationDatabaseTableId: column?.destinationDatabaseTableId ?? NONE,
      destinationDatabaseTableColumnId:
        column?.destinationDatabaseTableColumnId ?? NONE,
      destinationDatabaseTableColumnSubfieldId:
        column?.destinationDatabaseTableColumnSubfieldId ?? NONE,
      transformationMethod: column?.transformationMethod ?? "",
      description: asRichText(column?.description),
    },
    validators: {
      onSubmit: z
        .object({
          type: z.enum(COLUMN_TYPES),
          sourceDatabaseTableId: z.string(),
          sourceDatabaseTableColumnId: z.string(),
          sourceDatabaseTableColumnSubfieldId: z.string(),
          destinationDatabaseTableId: z.string(),
          destinationDatabaseTableColumnId: z.string(),
          destinationDatabaseTableColumnSubfieldId: z.string(),
          transformationMethod: z
            .string()
            .max(
              TRANSFORMATION_MAX_LENGTH,
              t`La transformation est trop longue`
            ),
          description: z.record(z.string(), z.unknown()),
        })
        .superRefine((value, ctx) => refineColumnStep(value, ctx, t)),
    },
    onSubmit: async ({ value, formApi }) => {
      // Drop the side the type does not read, so switching type mid-form never
      // ships an endpoint from the abandoned shape.
      const body = buildColumnBody(value);
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

  const values = useStore(form.store, (state) => state.values);
  const {
    type,
    sourceDatabaseTableId: sourceTableId,
    destinationDatabaseTableId: destinationTableId,
    sourceDatabaseTableColumnId: sourceColumnId,
    destinationDatabaseTableColumnId: destinationColumnId,
  } = values;

  const sourceTables = sourceTablesQuery.data?.items ?? [];
  const destinationTables = destinationTablesQuery.data?.items ?? [];
  const sourceTable = sourceTables.find(
    (candidate) => candidate.id === sourceTableId
  );
  const destinationTable = destinationTables.find(
    (candidate) => candidate.id === destinationTableId
  );

  const sourceColumn = (sourceTable?.columns ?? []).find(
    (candidate) => candidate.id === sourceColumnId
  );
  const destinationColumn = (destinationTable?.columns ?? []).find(
    (candidate) => candidate.id === destinationColumnId
  );

  const showSource = usesSource(type);
  const showDestination = usesDestination(type);
  const showSourceSubfield = showSource && hasSubfields(sourceColumn);
  const showDestinationSubfield =
    showDestination && hasSubfields(destinationColumn);
  const showTransformation = type === "migration";

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

          {showSource ? (
            <MigrationSideFields
              columnDisabled={!sourceTable}
              columnField="sourceDatabaseTableColumnId"
              columnLabel={t`Colonne source`}
              columnOptions={columnOptions(sourceTable)}
              form={form}
              loading={sourceTablesQuery.isLoading}
              showSubfield={showSourceSubfield}
              subfieldField="sourceDatabaseTableColumnSubfieldId"
              subfieldLabel={t`Sous-champ source`}
              subfieldOptions={subfieldOptions(sourceColumn, t`Aucun`)}
              tableField="sourceDatabaseTableId"
              tableLabel={t`Table source`}
              tableOptions={tableOptions(sourceTables)}
            />
          ) : null}

          {showDestination ? (
            <MigrationSideFields
              columnDisabled={!destinationTable}
              columnField="destinationDatabaseTableColumnId"
              columnLabel={t`Colonne de destination`}
              columnOptions={columnOptions(destinationTable)}
              form={form}
              loading={destinationTablesQuery.isLoading}
              showSubfield={showDestinationSubfield}
              subfieldField="destinationDatabaseTableColumnSubfieldId"
              subfieldLabel={t`Sous-champ de destination`}
              subfieldOptions={subfieldOptions(destinationColumn, t`Aucun`)}
              tableField="destinationDatabaseTableId"
              tableLabel={t`Table de destination`}
              tableOptions={tableOptions(destinationTables)}
            />
          ) : null}

          {showTransformation ? (
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
