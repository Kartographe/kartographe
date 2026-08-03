// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import { z } from "zod";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

type BoundedContext = components["schemas"]["ApplicationBoundedContextItem"];

const LIST_PATH =
  "/v1/accounts/{account_id}/applications/{application_id}/bounded-contexts";
const ITEM_PATH =
  "/v1/accounts/{account_id}/applications/{application_id}/bounded-contexts/{bounded_context_id}";
const COMPONENTS_PATH =
  "/v1/accounts/{account_id}/applications/{application_id}/components";

interface BoundedContextFormModalProps {
  accountId: string;
  applicationId: string;
  boundedContext?: BoundedContext;
  open: boolean;
  onClose: () => void;
}

export function BoundedContextFormModal({
  accountId,
  applicationId,
  boundedContext,
  open,
  onClose,
}: BoundedContextFormModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const isEdit = !!boundedContext;
  const path = { account_id: accountId, application_id: applicationId };

  // Only this application's components can be put inside the boundary — the API
  // refuses anything else, so the picker must not offer it either.
  const componentsQuery = $api.useQuery("get", COMPONENTS_PATH, {
    params: { path },
  });

  const createMutation = $api.useMutation("post", LIST_PATH, {
    meta: { successMessage: t`Contexte borné créé`, noErrorToast: true },
  });
  const updateMutation = $api.useMutation("patch", ITEM_PATH, {
    meta: { successMessage: t`Contexte borné mis à jour`, noErrorToast: true },
  });

  const form = useAppForm({
    defaultValues: {
      title: boundedContext?.title ?? "",
      description: boundedContext?.description ?? null,
      applicationComponentIds: boundedContext?.applicationComponentIds ?? [],
    },
    validators: {
      onSubmit: z.object({
        title: z.string().min(1, t`Le titre est requis`),
        description: z.record(z.string(), z.unknown()).nullable(),
        applicationComponentIds: z.array(z.string()),
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      const body = {
        title: value.title,
        description: value.description,
        applicationComponentIds: value.applicationComponentIds,
      };
      try {
        if (boundedContext) {
          await updateMutation.mutateAsync({
            params: {
              path: { ...path, bounded_context_id: boundedContext.id },
            },
            body,
          });
        } else {
          await createMutation.mutateAsync({ params: { path }, body });
        }
        queryClient.invalidateQueries({ queryKey: ["get", LIST_PATH] });
        queryClient.invalidateQueries({
          queryKey: ["get", "/v1/accounts/{account_id}/bounded-contexts"],
        });
        formApi.reset();
        onClose();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  const componentOptions = (componentsQuery.data?.items ?? []).map(
    (component) => ({ value: component.id, label: component.title })
  );

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={
        isEdit ? t`Modifier le contexte borné` : t`Créer un contexte borné`
      }
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="title">
            {(field) => (
              <field.TextField label={t`Titre`} placeholder={t`Facturation`} />
            )}
          </form.AppField>
          <form.AppField name="applicationComponentIds">
            {(field) => (
              <field.MultiSelectField
                label={t`Composants`}
                loading={componentsQuery.isLoading}
                options={componentOptions}
                placeholder={
                  componentOptions.length
                    ? t`Choisir les composants du contexte`
                    : t`Cette application n'a aucun composant`
                }
              />
            )}
          </form.AppField>
          <form.AppField name="description">
            {(field) => (
              <field.RichTextField
                label={t`Description`}
                placeholder={t`Quelle frontière ce contexte trace-t-il, et pourquoi ?`}
              />
            )}
          </form.AppField>
          <form.SubmitButton block>
            {isEdit ? t`Enregistrer` : t`Créer le contexte`}
          </form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
