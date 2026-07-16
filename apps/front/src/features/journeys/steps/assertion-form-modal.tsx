// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

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
import { useAssertionTypes } from "@/features/journeys/steps/use-action-types";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

type Assertion = components["schemas"]["JourneyScenarioStepAssertionItem"];

interface AssertionFormModalProps {
  accountId: string;
  journeyId: string;
  scenarioId: string;
  stepId: string;
  assertion?: Assertion;
  open: boolean;
  onClose: () => void;
}

export function AssertionFormModal({
  accountId,
  journeyId,
  scenarioId,
  stepId,
  assertion,
  open,
  onClose,
}: AssertionFormModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const isEdit = !!assertion;
  const assertionTypes = useAssertionTypes();
  const path = {
    account_id: accountId,
    journey_id: journeyId,
    scenario_id: scenarioId,
    step_id: stepId,
  };

  const [raw, setRaw] = useState<RawParameters>(() =>
    toRawParameters(
      assertionTypes.schema(assertion?.assertionTypeId),
      assertion?.parameters
    )
  );
  const [parameterErrors, setParameterErrors] = useState<
    Record<string, string>
  >({});

  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps/{step_id}/assertions",
    { meta: { successMessage: t`Assertion créée`, noErrorToast: true } }
  );
  const updateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps/{step_id}/assertions/{assertion_id}",
    { meta: { successMessage: t`Assertion mise à jour`, noErrorToast: true } }
  );

  const form = useAppForm({
    defaultValues: { assertionTypeId: assertion?.assertionTypeId ?? "" },
    validators: {
      onSubmit: z.object({
        assertionTypeId: z.string().min(1, t`Le type d'assertion est requis`),
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      const schema = assertionTypes.schema(value.assertionTypeId);
      const { values, errors } = parseParameters(schema, raw, {
        integer: t`Ce paramètre attend un nombre entier.`,
        dictionary: t`Ce paramètre attend un objet JSON valide.`,
      });
      setParameterErrors(errors);
      if (Object.keys(errors).length > 0) {
        return;
      }

      const body = {
        assertionTypeId: value.assertionTypeId,
        parameters: values,
      };
      try {
        if (assertion) {
          await updateMutation.mutateAsync({
            params: { path: { ...path, assertion_id: assertion.id } },
            body,
          });
        } else {
          await createMutation.mutateAsync({ params: { path }, body });
        }
        queryClient.invalidateQueries({
          queryKey: [
            "get",
            "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps/{step_id}/assertions",
          ],
        });
        formApi.reset();
        onClose();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  const assertionTypeId = useStore(
    form.store,
    (state) => state.values.assertionTypeId
  );

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={isEdit ? t`Modifier l'assertion` : t`Ajouter une assertion`}
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="assertionTypeId">
            {(field) => (
              <field.SelectField
                label={t`Type d'assertion`}
                loading={assertionTypes.isLoading}
                onChange={(value) => {
                  // The parameters belong to the previous type's schema.
                  setRaw(
                    toRawParameters(assertionTypes.schema(value), undefined)
                  );
                  setParameterErrors({});
                }}
                options={assertionTypes.options}
              />
            )}
          </form.AppField>

          <ParametersEditor
            errors={parameterErrors}
            onChange={setRaw}
            schema={assertionTypes.schema(assertionTypeId || null)}
            value={raw}
          />

          <form.SubmitButton block>
            {isEdit ? t`Enregistrer` : t`Ajouter l'assertion`}
          </form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
