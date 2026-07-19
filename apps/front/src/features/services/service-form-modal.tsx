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
import {
  SERVICE_CATEGORY_LABELS,
  SERVICE_TYPE_LABELS,
} from "@/features/services/labels";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";
import { asRichText, isRichTextEmpty } from "@/lib/rich-text/rich-text";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

type Service = components["schemas"]["ServiceItem"];
type ServiceType = components["schemas"]["ServiceType"];
type ServiceCategory = components["schemas"]["ServiceCategory"];

interface ServiceFormModalProps {
  accountId: string;
  service?: Service;
  open: boolean;
  onClose: () => void;
}

export function ServiceFormModal({
  accountId,
  service,
  open,
  onClose,
}: ServiceFormModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const isEdit = !!service;

  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/services",
    { meta: { successMessage: t`Service créé`, noErrorToast: true } }
  );
  const updateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/services/{service_id}",
    { meta: { successMessage: t`Service mis à jour`, noErrorToast: true } }
  );

  const form = useAppForm({
    defaultValues: {
      title: service?.title ?? "",
      type: (service?.type ?? "internal") as ServiceType,
      category: (service?.category ?? "other") as ServiceCategory,
      url: service?.url ?? "",
      openapiUrl: service?.openapiUrl ?? "",
      description: asRichText(service?.description),
    },
    validators: {
      onSubmit: z.object({
        title: z.string().min(1, t`Le titre est requis`),
        type: z.enum(dtoEnums.ServiceType),
        category: z.enum(dtoEnums.ServiceCategory),
        url: z.union([z.literal(""), z.url(t`URL invalide`)]),
        openapiUrl: z.union([z.literal(""), z.url(t`URL invalide`)]),
        description: z.record(z.string(), z.unknown()),
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      const body = {
        title: value.title,
        type: value.type,
        category: value.category,
        url: value.url || null,
        openapiUrl: value.openapiUrl || null,
        description: isRichTextEmpty(value.description)
          ? null
          : (value.description as RichTextDocument),
      };
      try {
        if (service) {
          await updateMutation.mutateAsync({
            params: { path: { account_id: accountId, service_id: service.id } },
            body,
          });
        } else {
          await createMutation.mutateAsync({
            params: { path: { account_id: accountId } },
            body,
          });
        }
        queryClient.invalidateQueries({
          queryKey: ["get", "/v1/accounts/{account_id}/services"],
        });
        queryClient.invalidateQueries({
          queryKey: ["get", "/v1/accounts/{account_id}/services/{service_id}"],
        });
        formApi.reset();
        onClose();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  const typeOptions = dtoEnums.ServiceType.map((value) => ({
    value,
    label: t(SERVICE_TYPE_LABELS[value]),
  }));
  const categoryOptions = dtoEnums.ServiceCategory.map((value) => ({
    value,
    label: t(SERVICE_CATEGORY_LABELS[value]),
  }));

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={isEdit ? t`Modifier le service` : t`Créer un service`}
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="title">
            {(field) => (
              <field.TextField
                label={t`Titre`}
                placeholder={t`Service de facturation`}
              />
            )}
          </form.AppField>
          <form.AppField name="type">
            {(field) => (
              <field.SelectField label={t`Type`} options={typeOptions} />
            )}
          </form.AppField>
          <form.AppField name="category">
            {(field) => (
              <field.SelectField
                label={t`Catégorie`}
                options={categoryOptions}
              />
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
                placeholder={t`À quoi sert ce service ?`}
              />
            )}
          </form.AppField>
          <form.SubmitButton block>
            {isEdit ? t`Enregistrer` : t`Créer le service`}
          </form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
