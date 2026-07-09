import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import { z } from "zod";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { dtoEnums } from "@/api/generated/schema.enums";
import {
  SCENARIO_CRITICITY_LABELS,
  SCENARIO_TYPE_LABELS,
} from "@/features/journeys/labels";
import { usePersonas } from "@/features/journeys/use-personas";
import { TagsField } from "@/features/tags/tags-field";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";
import { asRichText, isRichTextEmpty } from "@/lib/rich-text/rich-text";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

type JourneyScenario = components["schemas"]["JourneyScenarioItem"];
type ScenarioType = components["schemas"]["JourneyScenarioType"];
type ScenarioCriticity = components["schemas"]["JourneyScenarioCriticity"];

const TITLE_MAX_LENGTH = 255;

interface ScenarioFormModalProps {
  accountId: string;
  journeyId: string;
  scenario?: JourneyScenario;
  open: boolean;
  onClose: () => void;
}

export function ScenarioFormModal({
  accountId,
  journeyId,
  scenario,
  open,
  onClose,
}: ScenarioFormModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const isEdit = !!scenario;
  const personas = usePersonas(accountId);
  const path = { account_id: accountId, journey_id: journeyId };

  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios",
    { meta: { successMessage: t`Scénario créé`, noErrorToast: true } }
  );
  const updateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}",
    { meta: { successMessage: t`Scénario mis à jour`, noErrorToast: true } }
  );

  const form = useAppForm({
    defaultValues: {
      title: scenario?.title ?? "",
      type: (scenario?.type ?? "nominal") as ScenarioType,
      criticity: (scenario?.criticity ?? "medium") as ScenarioCriticity,
      personasIds: scenario?.personasIds ?? [],
      tagIds: scenario?.tagIds ?? [],
      description: asRichText(scenario?.description),
    },
    validators: {
      onSubmit: z.object({
        title: z
          .string()
          .min(1, t`Le titre est requis`)
          .max(TITLE_MAX_LENGTH, t`Le titre est trop long`),
        type: z.enum(dtoEnums.JourneyScenarioType),
        criticity: z.enum(dtoEnums.JourneyScenarioCriticity),
        personasIds: z.array(z.string()),
        tagIds: z.array(z.string()),
        description: z.record(z.string(), z.unknown()),
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      const body = {
        title: value.title,
        type: value.type,
        criticity: value.criticity,
        personasIds: value.personasIds,
        tagIds: value.tagIds,
        description: isRichTextEmpty(value.description)
          ? null
          : (value.description as RichTextDocument),
      };
      try {
        if (scenario) {
          await updateMutation.mutateAsync({
            params: { path: { ...path, scenario_id: scenario.id } },
            body,
          });
        } else {
          await createMutation.mutateAsync({ params: { path }, body });
        }
        queryClient.invalidateQueries({
          queryKey: [
            "get",
            "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios",
          ],
        });
        formApi.reset();
        onClose();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  const typeOptions = dtoEnums.JourneyScenarioType.map((value) => ({
    value,
    label: t(SCENARIO_TYPE_LABELS[value]),
  }));
  const criticityOptions = dtoEnums.JourneyScenarioCriticity.map((value) => ({
    value,
    label: t(SCENARIO_CRITICITY_LABELS[value]),
  }));

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={isEdit ? t`Modifier le scénario` : t`Créer un scénario`}
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="title">
            {(field) => (
              <field.TextField
                label={t`Titre`}
                placeholder={t`Paiement refusé par la banque`}
              />
            )}
          </form.AppField>
          <form.AppField name="type">
            {(field) => (
              <field.SelectField label={t`Type`} options={typeOptions} />
            )}
          </form.AppField>
          <form.AppField name="criticity">
            {(field) => (
              <field.SelectField
                label={t`Criticité`}
                options={criticityOptions}
              />
            )}
          </form.AppField>
          <form.AppField name="personasIds">
            {(field) => (
              <field.MultiSelectField
                label={t`Personas`}
                loading={personas.isLoading}
                options={personas.options}
                placeholder={t`Qui joue ce scénario ?`}
              />
            )}
          </form.AppField>
          <form.AppField name="tagIds">
            {(field) => (
              <TagsField
                accountId={accountId}
                entityType="journey_scenario"
                onChange={field.handleChange}
                value={field.state.value}
              />
            )}
          </form.AppField>
          <form.AppField name="description">
            {(field) => (
              <field.RichTextField
                label={t`Description`}
                placeholder={t`Dans quelles conditions ce scénario se déroule-t-il ?`}
              />
            )}
          </form.AppField>
          <form.SubmitButton block>
            {isEdit ? t`Enregistrer` : t`Créer le scénario`}
          </form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
