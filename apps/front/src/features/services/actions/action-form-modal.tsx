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
import { ACTION_TYPE_LABELS } from "@/features/services/labels";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";
import { asRichText, isRichTextEmpty } from "@/lib/rich-text/rich-text";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

type ServiceAction = components["schemas"]["ServiceActionItem"];
type ActionType = components["schemas"]["ServiceActionType"];
type Method = components["schemas"]["ServiceActionMethod"];

/** `method` and `path` are optional server-side: an event or a job has neither. */
const NO_METHOD = "";

interface ActionFormModalProps {
  accountId: string;
  serviceId: string;
  action?: ServiceAction;
  open: boolean;
  onClose: () => void;
}

export function ActionFormModal({
  accountId,
  serviceId,
  action,
  open,
  onClose,
}: ActionFormModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const isEdit = !!action;
  const path = { account_id: accountId, service_id: serviceId };

  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/services/{service_id}/actions",
    { meta: { successMessage: t`Action créée`, noErrorToast: true } }
  );
  const updateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/services/{service_id}/actions/{action_id}",
    { meta: { successMessage: t`Action mise à jour`, noErrorToast: true } }
  );

  const form = useAppForm({
    defaultValues: {
      type: (action?.type ?? "endpoint") as ActionType,
      title: action?.title ?? "",
      method: (action?.method ?? NO_METHOD) as Method | typeof NO_METHOD,
      path: action?.path ?? "",
      description: asRichText(action?.description),
    },
    validators: {
      onSubmit: z.object({
        type: z.enum(dtoEnums.ServiceActionType),
        title: z.string().min(1, t`Le titre est requis`),
        method: z.union([
          z.literal(NO_METHOD),
          z.enum(dtoEnums.ServiceActionMethod),
        ]),
        path: z.string(),
        description: z.record(z.string(), z.unknown()),
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      const body = {
        type: value.type,
        title: value.title,
        method: value.method === NO_METHOD ? null : value.method,
        path: value.path || null,
        description: isRichTextEmpty(value.description)
          ? null
          : (value.description as RichTextDocument),
      };
      try {
        if (action) {
          await updateMutation.mutateAsync({
            params: { path: { ...path, action_id: action.id } },
            body,
          });
        } else {
          await createMutation.mutateAsync({ params: { path }, body });
        }
        queryClient.invalidateQueries({
          queryKey: [
            "get",
            "/v1/accounts/{account_id}/services/{service_id}/actions",
          ],
        });
        formApi.reset();
        onClose();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  const typeOptions = dtoEnums.ServiceActionType.map((value) => ({
    value,
    label: t(ACTION_TYPE_LABELS[value]),
  }));
  const methodOptions = [
    { value: NO_METHOD, label: t`Aucune` },
    ...dtoEnums.ServiceActionMethod.map((value) => ({ value, label: value })),
  ];

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={isEdit ? t`Modifier l'action` : t`Créer une action`}
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="type">
            {(field) => (
              <field.SelectField label={t`Type`} options={typeOptions} />
            )}
          </form.AppField>
          <form.AppField name="title">
            {(field) => (
              <field.TextField
                label={t`Titre`}
                placeholder={t`Créer une facture`}
              />
            )}
          </form.AppField>
          <form.AppField name="method">
            {(field) => (
              <field.SelectField label={t`Méthode`} options={methodOptions} />
            )}
          </form.AppField>
          <form.AppField name="path">
            {(field) => (
              <field.RoutePathField
                label={t`Chemin`}
                placeholder="/v1/invoices/{id}"
              />
            )}
          </form.AppField>
          <form.AppField name="description">
            {(field) => (
              <field.RichTextField
                label={t`Description`}
                placeholder={t`Que fait cette action ?`}
              />
            )}
          </form.AppField>
          <form.SubmitButton block>
            {isEdit ? t`Enregistrer` : t`Créer l'action`}
          </form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
