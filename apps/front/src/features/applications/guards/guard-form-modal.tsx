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
  GUARD_FIELD_FORMAT_LABELS,
  GUARD_FIELD_TYPE_LABELS,
  GUARD_TYPE_LABELS,
} from "@/features/applications/labels";
import { TagsField } from "@/features/tags/tags-field";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

type Guard = components["schemas"]["ApplicationGuardItem"];
type GuardType = components["schemas"]["ApplicationGuardType"];
type FieldType = components["schemas"]["ApplicationGuardFieldType"];
type FieldFormat = components["schemas"]["ApplicationGuardFieldFormat"];

interface GuardFormModalProps {
  accountId: string;
  applicationId: string;
  guard?: Guard;
  open: boolean;
  onClose: () => void;
}

export function GuardFormModal({
  accountId,
  applicationId,
  guard,
  open,
  onClose,
}: GuardFormModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const isEdit = !!guard;

  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/applications/{application_id}/guards",
    { meta: { successMessage: t`Guard créé`, noErrorToast: true } }
  );
  const updateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/applications/{application_id}/guards/{guard_id}",
    { meta: { successMessage: t`Guard mis à jour`, noErrorToast: true } }
  );

  const form = useAppForm({
    defaultValues: {
      title: guard?.title ?? "",
      type: (guard?.type ?? "header_bearer") as GuardType,
      fieldType: (guard?.fieldType ?? "header") as FieldType,
      fieldKey: guard?.fieldKey ?? "",
      fieldFormat: (guard?.fieldFormat ?? "") as FieldFormat | "",
      tagIds: guard?.tagIds ?? [],
    },
    validators: {
      onSubmit: z.object({
        title: z.string().min(1, t`Le titre est requis`),
        type: z.enum(dtoEnums.ApplicationGuardType),
        fieldType: z.enum(dtoEnums.ApplicationGuardFieldType),
        fieldKey: z.string().min(1, t`La clé est requise`),
        fieldFormat: z.union([
          z.literal(""),
          z.enum(dtoEnums.ApplicationGuardFieldFormat),
        ]),
        tagIds: z.array(z.string()),
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      const body = {
        title: value.title,
        type: value.type,
        fieldType: value.fieldType,
        fieldKey: value.fieldKey,
        fieldFormat: value.fieldFormat || null,
        tagIds: value.tagIds,
      };
      try {
        if (guard) {
          await updateMutation.mutateAsync({
            params: {
              path: {
                account_id: accountId,
                application_id: applicationId,
                guard_id: guard.id,
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
            "/v1/accounts/{account_id}/applications/{application_id}/guards",
          ],
        });
        formApi.reset();
        onClose();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  const typeOptions = dtoEnums.ApplicationGuardType.map((value) => ({
    value,
    label: t(GUARD_TYPE_LABELS[value]),
  }));
  const fieldTypeOptions = dtoEnums.ApplicationGuardFieldType.map((value) => ({
    value,
    label: t(GUARD_FIELD_TYPE_LABELS[value]),
  }));
  const fieldFormatOptions = [
    { value: "", label: t`Aucun` },
    ...dtoEnums.ApplicationGuardFieldFormat.map((value) => ({
      value,
      label: t(GUARD_FIELD_FORMAT_LABELS[value]),
    })),
  ];

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={isEdit ? t`Modifier le guard` : t`Créer un guard`}
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="title">
            {(field) => (
              <field.TextField
                label={t`Titre`}
                placeholder={t`Authentification utilisateur`}
              />
            )}
          </form.AppField>
          <form.AppField name="type">
            {(field) => (
              <field.SelectField label={t`Type`} options={typeOptions} />
            )}
          </form.AppField>
          <form.AppField name="fieldType">
            {(field) => (
              <field.SelectField
                label={t`Emplacement`}
                options={fieldTypeOptions}
              />
            )}
          </form.AppField>
          <form.AppField name="fieldKey">
            {(field) => (
              <field.TextField label={t`Clé`} placeholder="Authorization" />
            )}
          </form.AppField>
          <form.AppField name="fieldFormat">
            {(field) => (
              <field.SelectField
                label={t`Format`}
                options={fieldFormatOptions}
              />
            )}
          </form.AppField>
          <form.AppField name="tagIds">
            {(field) => (
              <TagsField
                accountId={accountId}
                entityType="application_guard"
                onChange={field.handleChange}
                value={field.state.value}
              />
            )}
          </form.AppField>
          <form.SubmitButton block>
            {isEdit ? t`Enregistrer` : t`Créer le guard`}
          </form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
