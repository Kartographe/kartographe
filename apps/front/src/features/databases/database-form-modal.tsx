import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import { z } from "zod";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { dtoEnums } from "@/api/generated/schema.enums";
import { DATABASE_TYPE_LABELS } from "@/features/databases/labels";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";
import { asRichText, isRichTextEmpty } from "@/lib/rich-text/rich-text";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

type Database = components["schemas"]["DatabaseItem"];
type DatabaseType = components["schemas"]["DatabaseType"];

interface DatabaseFormModalProps {
  accountId: string;
  database?: Database;
  open: boolean;
  onClose: () => void;
}

export function DatabaseFormModal({
  accountId,
  database,
  open,
  onClose,
}: DatabaseFormModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const isEdit = !!database;

  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/databases",
    { meta: { successMessage: t`Base de données créée`, noErrorToast: true } }
  );
  const updateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/databases/{database_id}",
    {
      meta: {
        successMessage: t`Base de données mise à jour`,
        noErrorToast: true,
      },
    }
  );

  const form = useAppForm({
    defaultValues: {
      title: database?.title ?? "",
      type: (database?.type ?? "postgresql") as DatabaseType,
      description: asRichText(database?.description),
    },
    validators: {
      onSubmit: z.object({
        title: z.string().min(1, t`Le titre est requis`),
        type: z.enum(dtoEnums.DatabaseType),
        description: z.record(z.string(), z.unknown()),
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      const body = {
        title: value.title,
        type: value.type,
        description: isRichTextEmpty(value.description)
          ? null
          : (value.description as RichTextDocument),
      };
      try {
        if (database) {
          await updateMutation.mutateAsync({
            params: {
              path: { account_id: accountId, database_id: database.id },
            },
            body,
          });
        } else {
          await createMutation.mutateAsync({
            params: { path: { account_id: accountId } },
            body,
          });
        }
        queryClient.invalidateQueries({
          queryKey: ["get", "/v1/accounts/{account_id}/databases"],
        });
        queryClient.invalidateQueries({
          queryKey: [
            "get",
            "/v1/accounts/{account_id}/databases/{database_id}",
          ],
        });
        formApi.reset();
        onClose();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  const typeOptions = dtoEnums.DatabaseType.map((value) => ({
    value,
    label: t(DATABASE_TYPE_LABELS[value]),
  }));

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={
        isEdit ? t`Modifier la base de données` : t`Créer une base de données`
      }
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="title">
            {(field) => (
              <field.TextField
                label={t`Titre`}
                placeholder={t`Base de facturation`}
              />
            )}
          </form.AppField>
          <form.AppField name="type">
            {(field) => (
              <field.SelectField label={t`Moteur`} options={typeOptions} />
            )}
          </form.AppField>
          <form.AppField name="description">
            {(field) => (
              <field.RichTextField
                label={t`Description`}
                placeholder={t`Que stocke cette base ?`}
              />
            )}
          </form.AppField>
          <form.SubmitButton block>
            {isEdit ? t`Enregistrer` : t`Créer la base de données`}
          </form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
