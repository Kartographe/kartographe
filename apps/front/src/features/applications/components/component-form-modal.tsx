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
import { COMPONENT_TYPE_LABELS } from "@/features/applications/components/labels";
import { TagsField } from "@/features/tags/tags-field";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

type Component = components["schemas"]["ApplicationComponentItem"];
type ComponentType = components["schemas"]["ApplicationComponentType"];

const LIST_PATH =
  "/v1/accounts/{account_id}/applications/{application_id}/components";

interface ComponentFormModalProps {
  accountId: string;
  applicationId: string;
  component?: Component;
  open: boolean;
  onClose: () => void;
}

export function ComponentFormModal({
  accountId,
  applicationId,
  component,
  open,
  onClose,
}: ComponentFormModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const isEdit = !!component;

  const createMutation = $api.useMutation("post", LIST_PATH, {
    meta: { successMessage: t`Composant créé`, noErrorToast: true },
  });
  const updateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/applications/{application_id}/components/{component_id}",
    { meta: { successMessage: t`Composant mis à jour`, noErrorToast: true } }
  );

  const form = useAppForm({
    defaultValues: {
      title: component?.title ?? "",
      type: (component?.type ?? "other") as ComponentType,
      description: component?.description ?? null,
      tagIds: component?.tagIds ?? [],
    },
    validators: {
      onSubmit: z.object({
        title: z.string().min(1, t`Le titre est requis`),
        type: z.enum(dtoEnums.ApplicationComponentType),
        description: z.record(z.string(), z.unknown()).nullable(),
        tagIds: z.array(z.string()),
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      const body = {
        title: value.title,
        type: value.type,
        description: value.description,
        tagIds: value.tagIds,
      };
      try {
        if (component) {
          await updateMutation.mutateAsync({
            params: {
              path: {
                account_id: accountId,
                application_id: applicationId,
                component_id: component.id,
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
        queryClient.invalidateQueries({ queryKey: ["get", LIST_PATH] });
        queryClient.invalidateQueries({
          queryKey: ["get", "/v1/accounts/{account_id}/components"],
        });
        formApi.reset();
        onClose();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  const typeOptions = dtoEnums.ApplicationComponentType.map((value) => ({
    value,
    label: t(COMPONENT_TYPE_LABELS[value]),
  }));

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={isEdit ? t`Modifier le composant` : t`Créer un composant`}
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="title">
            {(field) => (
              <field.TextField
                label={t`Titre`}
                placeholder={t`Portail client`}
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
                placeholder={t`À quoi sert cette brique, et de quoi dépend-elle ?`}
              />
            )}
          </form.AppField>
          <form.AppField name="tagIds">
            {(field) => (
              <TagsField
                accountId={accountId}
                entityType="application_component"
                onChange={field.handleChange}
                value={field.state.value}
              />
            )}
          </form.AppField>
          <form.SubmitButton block>
            {isEdit ? t`Enregistrer` : t`Créer le composant`}
          </form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
