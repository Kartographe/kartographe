import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import { z } from "zod";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { dtoEnums } from "@/api/generated/schema.enums";
import { JOURNEY_TYPE_LABELS } from "@/features/journeys/labels";
import { usePersonas } from "@/features/journeys/use-personas";
import { TagsField } from "@/features/tags/tags-field";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";
import { asRichText, isRichTextEmpty } from "@/lib/rich-text/rich-text";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

type Journey = components["schemas"]["JourneyItem"];
type JourneyType = components["schemas"]["JourneyType"];

const TITLE_MAX_LENGTH = 255;

interface JourneyFormModalProps {
  accountId: string;
  journey?: Journey;
  open: boolean;
  onClose: () => void;
}

export function JourneyFormModal({
  accountId,
  journey,
  open,
  onClose,
}: JourneyFormModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const isEdit = !!journey;
  const personas = usePersonas(accountId);

  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/journeys",
    { meta: { successMessage: t`Parcours créé`, noErrorToast: true } }
  );
  const updateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/journeys/{journey_id}",
    { meta: { successMessage: t`Parcours mis à jour`, noErrorToast: true } }
  );

  const form = useAppForm({
    defaultValues: {
      title: journey?.title ?? "",
      type: (journey?.type ?? "customer") as JourneyType,
      personasIds: journey?.personasIds ?? [],
      tagIds: journey?.tagIds ?? [],
      description: asRichText(journey?.description),
    },
    validators: {
      onSubmit: z.object({
        title: z
          .string()
          .min(1, t`Le titre est requis`)
          .max(TITLE_MAX_LENGTH, t`Le titre est trop long`),
        type: z.enum(dtoEnums.JourneyType),
        personasIds: z.array(z.string()),
        tagIds: z.array(z.string()),
        description: z.record(z.string(), z.unknown()),
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      const body = {
        title: value.title,
        type: value.type,
        personasIds: value.personasIds,
        tagIds: value.tagIds,
        description: isRichTextEmpty(value.description)
          ? null
          : (value.description as RichTextDocument),
      };
      try {
        if (journey) {
          await updateMutation.mutateAsync({
            params: { path: { account_id: accountId, journey_id: journey.id } },
            body,
          });
        } else {
          await createMutation.mutateAsync({
            params: { path: { account_id: accountId } },
            body,
          });
        }
        queryClient.invalidateQueries({
          queryKey: ["get", "/v1/accounts/{account_id}/journeys"],
        });
        queryClient.invalidateQueries({
          queryKey: ["get", "/v1/accounts/{account_id}/journeys/{journey_id}"],
        });
        formApi.reset();
        onClose();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  const typeOptions = dtoEnums.JourneyType.map((value) => ({
    value,
    label: t(JOURNEY_TYPE_LABELS[value]),
  }));

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={isEdit ? t`Modifier le parcours` : t`Créer un parcours`}
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="title">
            {(field) => (
              <field.TextField
                label={t`Titre`}
                placeholder={t`Souscrire à un abonnement`}
              />
            )}
          </form.AppField>
          <form.AppField name="type">
            {(field) => (
              <field.SelectField label={t`Type`} options={typeOptions} />
            )}
          </form.AppField>
          <form.AppField name="personasIds">
            {(field) => (
              <field.MultiSelectField
                label={t`Personas`}
                loading={personas.isLoading}
                options={personas.options}
                placeholder={t`Qui suit ce parcours ?`}
              />
            )}
          </form.AppField>
          <form.AppField name="tagIds">
            {(field) => (
              <TagsField
                accountId={accountId}
                entityType="journey"
                onChange={field.handleChange}
                value={field.state.value}
              />
            )}
          </form.AppField>
          <form.AppField name="description">
            {(field) => (
              <field.RichTextField
                label={t`Description`}
                placeholder={t`Que cherche à accomplir l'utilisateur ?`}
              />
            )}
          </form.AppField>
          <form.SubmitButton block>
            {isEdit ? t`Enregistrer` : t`Créer le parcours`}
          </form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
