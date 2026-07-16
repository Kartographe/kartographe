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
import { ENVIRONMENT_TYPE_LABELS } from "@/features/applications/labels";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";
import { asRichText } from "@/lib/rich-text/rich-text";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

type Environment = components["schemas"]["ApplicationEnvironmentItem"];
type EnvironmentType = components["schemas"]["ApplicationEnvironmentType"];

interface EnvironmentFormModalProps {
  accountId: string;
  applicationId: string;
  environment?: Environment;
  open: boolean;
  onClose: () => void;
}

export function EnvironmentFormModal({
  accountId,
  applicationId,
  environment,
  open,
  onClose,
}: EnvironmentFormModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const isEdit = !!environment;

  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/applications/{application_id}/environments",
    { meta: { successMessage: t`Environnement créé`, noErrorToast: true } }
  );
  const updateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/applications/{application_id}/environments/{environment_id}",
    {
      meta: { successMessage: t`Environnement mis à jour`, noErrorToast: true },
    }
  );

  const form = useAppForm({
    defaultValues: {
      title: environment?.title ?? "",
      type: (environment?.type ?? "test") as EnvironmentType,
      description: asRichText(environment?.description),
      url: environment?.url ?? "",
      openapiUrl: environment?.openapiUrl ?? "",
    },
    validators: {
      onSubmit: z.object({
        title: z.string().min(1, t`Le titre est requis`),
        type: z.enum(dtoEnums.ApplicationEnvironmentType),
        description: z.record(z.string(), z.unknown()),
        url: z.union([z.literal(""), z.url(t`URL invalide`)]),
        openapiUrl: z.union([z.literal(""), z.url(t`URL invalide`)]),
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      const body = {
        title: value.title,
        type: value.type,
        description: value.description as RichTextDocument,
        url: value.url || null,
        openapiUrl: value.openapiUrl || null,
      };
      try {
        if (environment) {
          await updateMutation.mutateAsync({
            params: {
              path: {
                account_id: accountId,
                application_id: applicationId,
                environment_id: environment.id,
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
            "/v1/accounts/{account_id}/applications/{application_id}/environments",
          ],
        });
        formApi.reset();
        onClose();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  const typeOptions = dtoEnums.ApplicationEnvironmentType.map((value) => ({
    value,
    label: t(ENVIRONMENT_TYPE_LABELS[value]),
  }));

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={isEdit ? t`Modifier l'environnement` : t`Créer un environnement`}
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="title">
            {(field) => (
              <field.TextField label={t`Titre`} placeholder={t`Production`} />
            )}
          </form.AppField>
          <form.AppField name="type">
            {(field) => (
              <field.SelectField label={t`Type`} options={typeOptions} />
            )}
          </form.AppField>
          <form.AppField name="url">
            {(field) => (
              <field.TextField
                label={t`URL`}
                placeholder="https://api.example.com"
              />
            )}
          </form.AppField>
          <form.AppField name="openapiUrl">
            {(field) => (
              <field.TextField
                label={t`URL OpenAPI`}
                placeholder="https://api.example.com/openapi.json"
              />
            )}
          </form.AppField>
          <form.AppField name="description">
            {(field) => (
              <field.RichTextField
                label={t`Description`}
                placeholder={t`À quoi sert cet environnement ?`}
              />
            )}
          </form.AppField>
          <form.SubmitButton block>
            {isEdit ? t`Enregistrer` : t`Créer l'environnement`}
          </form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
