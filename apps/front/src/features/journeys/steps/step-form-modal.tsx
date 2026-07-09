import { useLingui } from "@lingui/react/macro";
import { useStore } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import { useState } from "react";
import { z } from "zod";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import {
  ParametersEditor,
  parseParameters,
  type RawParameters,
  toRawParameters,
} from "@/features/journeys/steps/parameters-editor";
import { useActionTypes } from "@/features/journeys/steps/use-action-types";
import { TagsField } from "@/features/tags/tags-field";
import type { RichTextDocument } from "@/lib/rich-text/rich-text";
import { asRichText, isRichTextEmpty } from "@/lib/rich-text/rich-text";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

type Step = components["schemas"]["JourneyScenarioStepItem"];

const TITLE_MAX_LENGTH = 255;

/** Empty string is how a select spells the API's `null`. */
const NONE = "";

interface StepFormModalProps {
  accountId: string;
  journeyId: string;
  scenarioId: string;
  /** Every step of the scenario, to offer as a parent. */
  steps: Step[];
  step?: Step;
  /** Pre-selected parent, when the step is created from another one. */
  parentId?: string;
  open: boolean;
  onClose: () => void;
}

export function StepFormModal({
  accountId,
  journeyId,
  scenarioId,
  steps,
  step,
  parentId,
  open,
  onClose,
}: StepFormModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const isEdit = !!step;
  const actionTypes = useActionTypes();
  const path = {
    account_id: accountId,
    journey_id: journeyId,
    scenario_id: scenarioId,
  };

  const [raw, setRaw] = useState<RawParameters>(() =>
    toRawParameters(actionTypes.schema(step?.actionTypeId), step?.parameters)
  );
  const [parameterErrors, setParameterErrors] = useState<
    Record<string, string>
  >({});

  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps",
    { meta: { successMessage: t`Étape créée`, noErrorToast: true } }
  );
  const updateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps/{step_id}",
    { meta: { successMessage: t`Étape mise à jour`, noErrorToast: true } }
  );

  const form = useAppForm({
    defaultValues: {
      title: step?.title ?? "",
      parentJourneyScenarioStepId:
        step?.parentJourneyScenarioStepId ?? parentId ?? NONE,
      actionTypeId: step?.actionTypeId ?? NONE,
      optional: step?.optional ?? false,
      tagIds: step?.tagIds ?? [],
      description: asRichText(step?.description),
    },
    validators: {
      onSubmit: z.object({
        title: z
          .string()
          .min(1, t`Le titre est requis`)
          .max(TITLE_MAX_LENGTH, t`Le titre est trop long`),
        parentJourneyScenarioStepId: z.string(),
        actionTypeId: z.string(),
        optional: z.boolean(),
        tagIds: z.array(z.string()),
        description: z.record(z.string(), z.unknown()),
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      // With no action the API demands empty parameters; with one, the key set
      // must match its schema exactly.
      const schema = actionTypes.schema(value.actionTypeId || null);
      const { values, errors } = parseParameters(schema, raw, {
        integer: t`Ce paramètre attend un nombre entier.`,
        dictionary: t`Ce paramètre attend un objet JSON valide.`,
      });
      setParameterErrors(errors);
      if (Object.keys(errors).length > 0) {
        return;
      }

      const body = {
        title: value.title,
        parentJourneyScenarioStepId: value.parentJourneyScenarioStepId || null,
        actionTypeId: value.actionTypeId || null,
        optional: value.optional,
        parameters: value.actionTypeId ? values : {},
        tagIds: value.tagIds,
        description: isRichTextEmpty(value.description)
          ? null
          : (value.description as RichTextDocument),
      };
      try {
        if (step) {
          await updateMutation.mutateAsync({
            params: { path: { ...path, step_id: step.id } },
            body,
          });
        } else {
          await createMutation.mutateAsync({ params: { path }, body });
        }
        queryClient.invalidateQueries({
          queryKey: [
            "get",
            "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps",
          ],
        });
        formApi.reset();
        onClose();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  const actionTypeId = useStore(
    form.store,
    (state) => state.values.actionTypeId
  );
  const schema = actionTypes.schema(actionTypeId || null);

  // A step cannot be its own parent, nor — the API would reject it — a step of
  // another scenario. Descendants are left in: the API guards the cycle.
  const parentOptions = [
    { value: NONE, label: t`Aucune (étape racine)` },
    ...steps
      .filter((candidate) => candidate.id !== step?.id)
      .map((candidate) => ({ value: candidate.id, label: candidate.title })),
  ];
  const actionOptions = [
    { value: NONE, label: t`Aucune action` },
    ...actionTypes.options,
  ];

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={isEdit ? t`Modifier l'étape` : t`Ajouter une étape`}
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="title">
            {(field) => (
              <field.TextField
                label={t`Titre`}
                placeholder={t`Saisir son adresse email`}
              />
            )}
          </form.AppField>
          <form.AppField name="parentJourneyScenarioStepId">
            {(field) => (
              <field.SelectField
                label={t`Étape précédente`}
                options={parentOptions}
              />
            )}
          </form.AppField>
          <form.AppField name="actionTypeId">
            {(field) => (
              <field.SelectField
                label={t`Action`}
                loading={actionTypes.isLoading}
                onChange={(value) => {
                  // The parameters belong to the previous action's schema.
                  setRaw(toRawParameters(actionTypes.schema(value), undefined));
                  setParameterErrors({});
                }}
                options={actionOptions}
              />
            )}
          </form.AppField>

          <ParametersEditor
            errors={parameterErrors}
            onChange={setRaw}
            schema={schema}
            value={raw}
          />

          <form.AppField name="optional">
            {(field) => (
              <field.CheckboxField>{t`Étape optionnelle`}</field.CheckboxField>
            )}
          </form.AppField>
          <form.AppField name="tagIds">
            {(field) => (
              <TagsField
                accountId={accountId}
                entityType="journey_scenario_step"
                onChange={field.handleChange}
                value={field.state.value}
              />
            )}
          </form.AppField>
          <form.AppField name="description">
            {(field) => (
              <field.RichTextField
                label={t`Description`}
                placeholder={t`Que fait l'utilisateur à cette étape ?`}
              />
            )}
          </form.AppField>
          <form.SubmitButton block>
            {isEdit ? t`Enregistrer` : t`Ajouter l'étape`}
          </form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
