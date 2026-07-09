import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import { z } from "zod";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { dtoEnums } from "@/api/generated/schema.enums";
import { VERSION_TYPE_LABELS } from "@/features/applications/labels";
import { formatVersion, parseVersion } from "@/features/applications/version";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";
import { asRichText, isRichTextEmpty } from "@/lib/rich-text/rich-text";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

type Version = components["schemas"]["ApplicationVersionItem"];
type VersionType = components["schemas"]["ApplicationVersionType"];

const VERSION_PATTERN = /^\d+(\.\d+)*$/;

interface VersionFormModalProps {
  accountId: string;
  applicationId: string;
  version?: Version;
  open: boolean;
  onClose: () => void;
}

export function VersionFormModal({
  accountId,
  applicationId,
  version,
  open,
  onClose,
}: VersionFormModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const isEdit = !!version;

  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/applications/{application_id}/versions",
    { meta: { successMessage: t`Version créée`, noErrorToast: true } }
  );
  const updateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/applications/{application_id}/versions/{version_id}",
    { meta: { successMessage: t`Version mise à jour`, noErrorToast: true } }
  );

  const form = useAppForm({
    defaultValues: {
      title: version?.title ?? "",
      version: version ? formatVersion(version.version) : "",
      type: (version?.type ?? "dev") as VersionType,
      description: asRichText(version?.description),
    },
    validators: {
      onSubmit: z.object({
        title: z.string().min(1, t`Le titre est requis`),
        version: z.string().regex(VERSION_PATTERN, t`Format attendu : 1.2.3`),
        type: z.enum(dtoEnums.ApplicationVersionType),
        description: z.record(z.string(), z.unknown()),
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      const body = {
        title: value.title,
        version: parseVersion(value.version),
        type: value.type,
        description: isRichTextEmpty(value.description)
          ? null
          : (value.description as RichTextDocument),
      };
      try {
        if (version) {
          await updateMutation.mutateAsync({
            params: {
              path: {
                account_id: accountId,
                application_id: applicationId,
                version_id: version.id,
              },
            },
            body,
          });
        } else {
          await createMutation.mutateAsync({
            params: {
              path: { account_id: accountId, application_id: applicationId },
            },
            body,
          });
        }
        queryClient.invalidateQueries({
          queryKey: [
            "get",
            "/v1/accounts/{account_id}/applications/{application_id}/versions",
          ],
        });
        formApi.reset();
        onClose();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  const typeOptions = dtoEnums.ApplicationVersionType.map((value) => ({
    value,
    label: t(VERSION_TYPE_LABELS[value]),
  }));

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={isEdit ? t`Modifier la version` : t`Créer une version`}
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="title">
            {(field) => (
              <field.TextField
                label={t`Titre`}
                placeholder={t`Refonte du tunnel de paiement`}
              />
            )}
          </form.AppField>
          <form.AppField name="version">
            {(field) => (
              <field.TextField label={t`Version`} placeholder="1.2.3" />
            )}
          </form.AppField>
          <form.AppField name="type">
            {(field) => (
              <field.SelectField label={t`Type`} options={typeOptions} />
            )}
          </form.AppField>
          <form.AppField name="description">
            {(field) => (
              <field.RichTextField
                label={t`Description`}
                placeholder={t`Contenu de cette version`}
              />
            )}
          </form.AppField>
          <form.SubmitButton block>
            {isEdit ? t`Enregistrer` : t`Créer la version`}
          </form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
