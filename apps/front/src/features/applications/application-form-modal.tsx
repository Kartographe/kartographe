import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import { z } from "zod";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { dtoEnums } from "@/api/generated/schema.enums";
import { APPLICATION_TYPE_LABELS } from "@/features/applications/labels";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

type Application = components["schemas"]["ApplicationItem"];
type ApplicationType = components["schemas"]["ApplicationType"];

interface ApplicationFormModalProps {
  accountId: string;
  application?: Application;
  open: boolean;
  onClose: () => void;
}

export function ApplicationFormModal({
  accountId,
  application,
  open,
  onClose,
}: ApplicationFormModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const isEdit = !!application;

  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/applications",
    { meta: { successMessage: t`Application créée`, noErrorToast: true } }
  );
  const updateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/applications/{application_id}",
    { meta: { successMessage: t`Application mise à jour`, noErrorToast: true } }
  );

  const form = useAppForm({
    defaultValues: {
      title: application?.title ?? "",
      description: application?.description ?? "",
      type: (application?.type ?? "customer") as ApplicationType,
    },
    validators: {
      onSubmit: z.object({
        title: z.string().min(1, t`Le titre est requis`),
        description: z.string(),
        type: z.enum(dtoEnums.ApplicationType),
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      const body = {
        title: value.title,
        description: value.description || null,
        type: value.type,
      };
      try {
        if (application) {
          await updateMutation.mutateAsync({
            params: {
              path: { account_id: accountId, application_id: application.id },
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
          queryKey: ["get", "/v1/accounts/{account_id}/applications"],
        });
        queryClient.invalidateQueries({
          queryKey: [
            "get",
            "/v1/accounts/{account_id}/applications/{application_id}",
          ],
        });
        formApi.reset();
        onClose();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  const typeOptions = dtoEnums.ApplicationType.map((value) => ({
    value,
    label: t(APPLICATION_TYPE_LABELS[value]),
  }));

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={isEdit ? t`Modifier l'application` : t`Créer une application`}
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="title">
            {(field) => (
              <field.TextField
                label={t`Titre`}
                placeholder={t`Mon application`}
              />
            )}
          </form.AppField>
          <form.AppField name="type">
            {(field) => (
              <field.SelectField label={t`Type`} options={typeOptions} />
            )}
          </form.AppField>
          <form.AppField name="description">
            {(field) => (
              <field.TextAreaField
                label={t`Description`}
                placeholder={t`À quoi sert cette application ?`}
              />
            )}
          </form.AppField>
          <form.SubmitButton block>
            {isEdit ? t`Enregistrer` : t`Créer l'application`}
          </form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
