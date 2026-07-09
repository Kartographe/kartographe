import { useLingui } from "@lingui/react/macro";
import { useStore } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import { z } from "zod";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import type { ColumnTypeLookup } from "@/features/databases/use-column-types";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";
import { asRichText, isRichTextEmpty } from "@/lib/rich-text/rich-text";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

type DatabaseTable = components["schemas"]["DatabaseTableItem"];
type Column = components["schemas"]["DatabaseTableColumnItem"];

/** Empty string stands for "no foreign key", which the API spells as `null`. */
const NO_FK = "";

interface ColumnFormModalProps {
  accountId: string;
  databaseId: string;
  versionId: string;
  table: DatabaseTable;
  /** Every table of the version, to offer as a foreign-key target. */
  tables: DatabaseTable[];
  columnTypes: ColumnTypeLookup;
  column?: Column;
  open: boolean;
  onClose: () => void;
}

export function ColumnFormModal({
  accountId,
  databaseId,
  versionId,
  table,
  tables,
  columnTypes,
  column,
  open,
  onClose,
}: ColumnFormModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const isEdit = !!column;
  const path = {
    account_id: accountId,
    database_id: databaseId,
    database_version_id: versionId,
    database_table_id: table.id,
  };

  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/columns",
    { meta: { successMessage: t`Colonne créée`, noErrorToast: true } }
  );
  const updateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables/{database_table_id}/columns/{database_table_column_id}",
    { meta: { successMessage: t`Colonne mise à jour`, noErrorToast: true } }
  );

  // `rank` orders the columns; it is derived, never asked of the user.
  const nextRank = (table.columns ?? []).length;

  const form = useAppForm({
    defaultValues: {
      name: column?.name ?? "",
      databaseColumnTypeId: column?.databaseColumnTypeId ?? "",
      defaultValue: column?.defaultValue ?? "",
      nullable: column?.nullable ?? true,
      unique: column?.unique ?? false,
      systemField: column?.systemField ?? false,
      foreignKeyDatabaseTableId: column?.foreignKeyDatabaseTableId ?? NO_FK,
      foreignKeyDatabaseTableColumnId:
        column?.foreignKeyDatabaseTableColumnId ?? NO_FK,
      description: asRichText(column?.description),
    },
    validators: {
      onSubmit: z.object({
        name: z.string().min(1, t`Le nom est requis`),
        databaseColumnTypeId: z.string().min(1, t`Le type est requis`),
        defaultValue: z.string(),
        nullable: z.boolean(),
        unique: z.boolean(),
        systemField: z.boolean(),
        foreignKeyDatabaseTableId: z.string(),
        foreignKeyDatabaseTableColumnId: z.string(),
        description: z.record(z.string(), z.unknown()),
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      const fkTable = value.foreignKeyDatabaseTableId || null;
      const body = {
        name: value.name,
        databaseColumnTypeId: value.databaseColumnTypeId,
        defaultValue: value.defaultValue,
        nullable: value.nullable,
        unique: value.unique,
        systemField: value.systemField,
        // A target column without its table would dangle — drop both together.
        foreignKeyDatabaseTableId: fkTable,
        foreignKeyDatabaseTableColumnId: fkTable
          ? value.foreignKeyDatabaseTableColumnId || null
          : null,
        rank: column?.rank ?? nextRank,
        description: isRichTextEmpty(value.description)
          ? null
          : (value.description as RichTextDocument),
      };
      try {
        if (column) {
          await updateMutation.mutateAsync({
            params: { path: { ...path, database_table_column_id: column.id } },
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

  const fkTableId = useStore(
    form.store,
    (state) => state.values.foreignKeyDatabaseTableId
  );
  const fkTable = tables.find((candidate) => candidate.id === fkTableId);

  const tableOptions = [
    { value: NO_FK, label: t`Aucune` },
    ...tables.map((candidate) => ({
      value: candidate.id,
      label: `${candidate.schema}.${candidate.name}`,
    })),
  ];
  const fkColumnOptions = [
    { value: NO_FK, label: t`Aucune` },
    ...(fkTable?.columns ?? []).map((candidate) => ({
      value: candidate.id,
      label: candidate.name,
    })),
  ];

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={isEdit ? t`Modifier la colonne` : t`Créer une colonne`}
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="name">
            {(field) => <field.TextField label={t`Nom`} placeholder="email" />}
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
          <form.AppField name="defaultValue">
            {(field) => (
              <field.TextField
                label={t`Valeur par défaut`}
                placeholder={t`Aucune`}
              />
            )}
          </form.AppField>
          <form.AppField name="nullable">
            {(field) => (
              <field.CheckboxField>{t`Nullable`}</field.CheckboxField>
            )}
          </form.AppField>
          <form.AppField name="unique">
            {(field) => <field.CheckboxField>{t`Unique`}</field.CheckboxField>}
          </form.AppField>
          <form.AppField name="systemField">
            {(field) => (
              <field.CheckboxField>{t`Champ système`}</field.CheckboxField>
            )}
          </form.AppField>
          <form.AppField name="foreignKeyDatabaseTableId">
            {(field) => (
              <field.SelectField
                label={t`Table référencée`}
                options={tableOptions}
              />
            )}
          </form.AppField>
          <form.AppField name="foreignKeyDatabaseTableColumnId">
            {(field) => (
              <field.SelectField
                disabled={!fkTable}
                label={t`Colonne référencée`}
                options={fkColumnOptions}
              />
            )}
          </form.AppField>
          <form.AppField name="description">
            {(field) => (
              <field.RichTextField
                label={t`Description`}
                placeholder={t`Que contient cette colonne ?`}
              />
            )}
          </form.AppField>
          <form.SubmitButton block>
            {isEdit ? t`Enregistrer` : t`Créer la colonne`}
          </form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
