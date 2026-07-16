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
import { PERSONA_TYPE_LABELS } from "@/features/personas/labels";
import { TagsField } from "@/features/tags/tags-field";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";
import { asRichText, isRichTextEmpty } from "@/lib/rich-text/rich-text";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

type Persona = components["schemas"]["PersonaItem"];
type PersonaType = components["schemas"]["PersonaType"];

const TITLE_MAX_LENGTH = 255;

interface PersonaFormModalProps {
  accountId: string;
  persona?: Persona;
  open: boolean;
  onClose: () => void;
}

export function PersonaFormModal({
  accountId,
  persona,
  open,
  onClose,
}: PersonaFormModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const isEdit = !!persona;

  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/personas",
    { meta: { successMessage: t`Persona créé`, noErrorToast: true } }
  );
  const updateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/personas/{persona_id}",
    { meta: { successMessage: t`Persona mis à jour`, noErrorToast: true } }
  );

  const form = useAppForm({
    defaultValues: {
      title: persona?.title ?? "",
      type: (persona?.type ?? "customer") as PersonaType,
      tagIds: persona?.tagIds ?? [],
      description: asRichText(persona?.description),
    },
    validators: {
      onSubmit: z.object({
        title: z
          .string()
          .min(1, t`Le titre est requis`)
          .max(TITLE_MAX_LENGTH, t`Le titre est trop long`),
        type: z.enum(dtoEnums.PersonaType),
        tagIds: z.array(z.string()),
        description: z.record(z.string(), z.unknown()),
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      const body = {
        title: value.title,
        type: value.type,
        tagIds: value.tagIds,
        description: isRichTextEmpty(value.description)
          ? null
          : (value.description as RichTextDocument),
      };
      try {
        if (persona) {
          await updateMutation.mutateAsync({
            params: { path: { account_id: accountId, persona_id: persona.id } },
            body,
          });
        } else {
          await createMutation.mutateAsync({
            params: { path: { account_id: accountId } },
            body,
          });
        }
        queryClient.invalidateQueries({
          queryKey: ["get", "/v1/accounts/{account_id}/personas"],
        });
        formApi.reset();
        onClose();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  const typeOptions = dtoEnums.PersonaType.map((value) => ({
    value,
    label: t(PERSONA_TYPE_LABELS[value]),
  }));

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={isEdit ? t`Modifier le persona` : t`Créer un persona`}
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="title">
            {(field) => (
              <field.TextField
                label={t`Titre`}
                placeholder={t`Responsable de la facturation`}
              />
            )}
          </form.AppField>
          <form.AppField name="type">
            {(field) => (
              <field.SelectField label={t`Type`} options={typeOptions} />
            )}
          </form.AppField>
          <form.AppField name="tagIds">
            {(field) => (
              <TagsField
                accountId={accountId}
                entityType="persona"
                onChange={field.handleChange}
                value={field.state.value}
              />
            )}
          </form.AppField>
          <form.AppField name="description">
            {(field) => (
              <field.RichTextField
                label={t`Description`}
                placeholder={t`Quels sont ses objectifs, ses contraintes, son quotidien ?`}
              />
            )}
          </form.AppField>
          <form.SubmitButton block>
            {isEdit ? t`Enregistrer` : t`Créer le persona`}
          </form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
