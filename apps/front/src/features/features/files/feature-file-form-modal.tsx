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
import { FEATURE_FILE_TYPE_LABELS } from "@/features/features/labels";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";
import { asRichText, isRichTextEmpty } from "@/lib/rich-text/rich-text";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

type FeatureFile = components["schemas"]["FeatureFileItem"];
type FeatureFileType = components["schemas"]["FeatureFileType"];

const NAME_MAX_LENGTH = 255;

interface FeatureFileFormModalProps {
  accountId: string;
  featureId: string;
  /** The modal is open exactly when a file is passed — only metadata is editable. */
  file: FeatureFile | undefined;
  onClose: () => void;
}

export function FeatureFileFormModal({
  accountId,
  featureId,
  file,
  onClose,
}: FeatureFileFormModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();

  const updateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/features/{feature_id}/files/{feature_file_id}",
    { meta: { successMessage: t`Fichier mis à jour`, noErrorToast: true } }
  );

  const form = useAppForm({
    defaultValues: {
      name: file?.name ?? "",
      type: (file?.type ?? "document") as FeatureFileType,
      description: asRichText(file?.description),
    },
    validators: {
      onSubmit: z.object({
        name: z
          .string()
          .min(1, t`Le nom est requis`)
          .max(NAME_MAX_LENGTH, t`Le nom est trop long`),
        type: z.enum(dtoEnums.FeatureFileType),
        description: z.record(z.string(), z.unknown()),
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      if (!file) {
        return;
      }
      try {
        await updateMutation.mutateAsync({
          params: {
            path: {
              account_id: accountId,
              feature_id: featureId,
              feature_file_id: file.id,
            },
          },
          body: {
            name: value.name,
            type: value.type,
            description: isRichTextEmpty(value.description)
              ? null
              : (value.description as RichTextDocument),
          },
        });
        queryClient.invalidateQueries({
          queryKey: [
            "get",
            "/v1/accounts/{account_id}/features/{feature_id}/files",
          ],
        });
        formApi.reset();
        onClose();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  const typeOptions = dtoEnums.FeatureFileType.map((value) => ({
    value,
    label: t(FEATURE_FILE_TYPE_LABELS[value]),
  }));

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={!!file}
      title={t`Modifier le fichier`}
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="name">
            {(field) => (
              <field.TextField
                label={t`Nom`}
                placeholder={t`Maquette de l'écran de facturation`}
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
              <field.RichTextField
                label={t`Description`}
                placeholder={t`Que montre ce fichier ?`}
              />
            )}
          </form.AppField>
          <form.SubmitButton block>{t`Enregistrer`}</form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
