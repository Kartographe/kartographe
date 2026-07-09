import { useLingui } from "@lingui/react/macro";
import { useStore } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import { z } from "zod";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import {
  compareVersionsDesc,
  formatVersion,
  MIGRATION_TYPE_LABELS,
} from "@/features/databases/labels";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";
import { asRichText, isRichTextEmpty } from "@/lib/rich-text/rich-text";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

type DatabaseMigration = components["schemas"]["DatabaseMigrationItem"];
type MigrationType = components["schemas"]["DatabaseMigrationType"];

const MIGRATION_TYPES: MigrationType[] = ["minor", "major"];
const TITLE_MAX_LENGTH = 255;

interface MigrationFormModalProps {
  accountId: string;
  databaseId: string;
  migration?: DatabaseMigration;
  open: boolean;
  onClose: () => void;
}

export function MigrationFormModal({
  accountId,
  databaseId,
  migration,
  open,
  onClose,
}: MigrationFormModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const isEdit = !!migration;
  const path = { account_id: accountId, database_id: databaseId };

  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/databases/{database_id}/migrations",
    { meta: { successMessage: t`Migration créée`, noErrorToast: true } }
  );
  const updateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/databases/{database_id}/migrations/{database_migration_id}",
    { meta: { successMessage: t`Migration mise à jour`, noErrorToast: true } }
  );

  const form = useAppForm({
    defaultValues: {
      type: migration?.type ?? ("minor" as MigrationType),
      title: migration?.title ?? "",
      sourceDatabaseVersionId: migration?.sourceDatabaseVersionId ?? "",
      destinationDatabaseId: migration?.destinationDatabaseId ?? databaseId,
      destinationDatabaseVersionId:
        migration?.destinationDatabaseVersionId ?? "",
      description: asRichText(migration?.description),
    },
    validators: {
      onSubmit: z.object({
        type: z.enum(MIGRATION_TYPES),
        title: z
          .string()
          .min(1, t`Le titre est requis`)
          .max(TITLE_MAX_LENGTH, t`Le titre est trop long`),
        sourceDatabaseVersionId: z
          .string()
          .min(1, t`La version de départ est requise`),
        destinationDatabaseId: z
          .string()
          .min(1, t`La base de destination est requise`),
        destinationDatabaseVersionId: z
          .string()
          .min(1, t`La version d'arrivée est requise`),
        description: z.record(z.string(), z.unknown()),
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      const body = {
        type: value.type,
        title: value.title,
        sourceDatabaseVersionId: value.sourceDatabaseVersionId,
        destinationDatabaseId: value.destinationDatabaseId,
        destinationDatabaseVersionId: value.destinationDatabaseVersionId,
        description: isRichTextEmpty(value.description)
          ? null
          : (value.description as RichTextDocument),
      };
      try {
        if (migration) {
          await updateMutation.mutateAsync({
            params: { path: { ...path, database_migration_id: migration.id } },
            body,
          });
        } else {
          await createMutation.mutateAsync({ params: { path }, body });
        }
        queryClient.invalidateQueries({
          queryKey: [
            "get",
            "/v1/accounts/{account_id}/databases/{database_id}/migrations",
          ],
        });
        formApi.reset();
        onClose();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  const destinationDatabaseId = useStore(
    form.store,
    (state) => state.values.destinationDatabaseId
  );

  const databasesQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases",
    { params: { path: { account_id: accountId }, query: { limit: 100 } } }
  );
  const sourceVersionsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases/{database_id}/versions",
    { params: { path } }
  );
  // The migration may land on another database, so its versions are a separate
  // listing — refetched whenever the destination changes.
  const destinationVersionsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases/{database_id}/versions",
    {
      params: {
        path: { account_id: accountId, database_id: destinationDatabaseId },
      },
    },
    { enabled: !!destinationDatabaseId }
  );

  function versionOptions(versions: { id: string; version: number[] }[]) {
    return [...versions]
      .sort((a, b) => compareVersionsDesc(a.version, b.version))
      .map((version) => ({
        value: version.id,
        label: formatVersion(version.version),
      }));
  }

  const databaseOptions = (databasesQuery.data?.items ?? []).map(
    (database) => ({
      value: database.id,
      label: database.title,
    })
  );

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={isEdit ? t`Modifier la migration` : t`Créer une migration`}
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="title">
            {(field) => (
              <field.TextField
                label={t`Titre`}
                placeholder={t`Passage des emails en minuscules`}
              />
            )}
          </form.AppField>
          <form.AppField name="type">
            {(field) => (
              <field.SelectField
                label={t`Type`}
                options={MIGRATION_TYPES.map((type) => ({
                  value: type,
                  label: t(MIGRATION_TYPE_LABELS[type]),
                }))}
              />
            )}
          </form.AppField>
          <form.AppField name="sourceDatabaseVersionId">
            {(field) => (
              <field.SelectField
                label={t`Version de départ`}
                loading={sourceVersionsQuery.isLoading}
                options={versionOptions(sourceVersionsQuery.data?.items ?? [])}
              />
            )}
          </form.AppField>
          <form.AppField name="destinationDatabaseId">
            {(field) => (
              <field.SelectField
                label={t`Base de destination`}
                loading={databasesQuery.isLoading}
                onChange={() => {
                  // The version belongs to the previous database — it cannot
                  // survive the switch.
                  form.setFieldValue("destinationDatabaseVersionId", "");
                }}
                options={databaseOptions}
              />
            )}
          </form.AppField>
          <form.AppField name="destinationDatabaseVersionId">
            {(field) => (
              <field.SelectField
                disabled={!destinationDatabaseId}
                label={t`Version d'arrivée`}
                loading={destinationVersionsQuery.isLoading}
                options={versionOptions(
                  destinationVersionsQuery.data?.items ?? []
                )}
              />
            )}
          </form.AppField>
          <form.AppField name="description">
            {(field) => (
              <field.RichTextField
                label={t`Description`}
                placeholder={t`Que change cette migration ?`}
              />
            )}
          </form.AppField>
          <form.SubmitButton block>
            {isEdit ? t`Enregistrer` : t`Créer la migration`}
          </form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
