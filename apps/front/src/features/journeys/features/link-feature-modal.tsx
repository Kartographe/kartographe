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

type Feature = components["schemas"]["FeatureItem"];

interface LinkFeatureModalProps {
  accountId: string;
  journeyId: string;
  /** The account's features not already linked to this journey. */
  features: Feature[];
  isLoading: boolean;
  open: boolean;
  onClose: () => void;
}

export function LinkFeatureModal({
  accountId,
  journeyId,
  features,
  isLoading,
  open,
  onClose,
}: LinkFeatureModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();

  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/journeys/{journey_id}/features",
    { meta: { successMessage: t`Fonctionnalité liée`, noErrorToast: true } }
  );

  const form = useAppForm({
    defaultValues: { featureId: "" },
    validators: {
      onSubmit: z.object({
        featureId: z.string().min(1, t`La fonctionnalité est requise`),
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      try {
        await createMutation.mutateAsync({
          params: { path: { account_id: accountId, journey_id: journeyId } },
          body: { featureId: value.featureId },
        });
        queryClient.invalidateQueries({
          queryKey: [
            "get",
            "/v1/accounts/{account_id}/journeys/{journey_id}/features",
          ],
        });
        formApi.reset();
        onClose();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  const options = features.map((feature) => ({
    value: feature.id,
    label: feature.title,
  }));

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={t`Lier une fonctionnalité`}
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="featureId">
            {(field) => (
              <field.SelectField
                label={t`Fonctionnalité`}
                loading={isLoading}
                options={options}
                placeholder={
                  options.length
                    ? t`Choisir une fonctionnalité`
                    : t`Toutes les fonctionnalités sont déjà liées`
                }
              />
            )}
          </form.AppField>
          <form.SubmitButton
            block
          >{t`Lier la fonctionnalité`}</form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
