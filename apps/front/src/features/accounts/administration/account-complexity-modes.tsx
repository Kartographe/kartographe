// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Card, Flex, Typography } from "antd";
import { z } from "zod";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { dtoEnums } from "@/api/generated/schema.enums";
import {
  COMPLEXITY_MODE_DESCRIPTIONS,
  COMPLEXITY_MODE_LABELS,
  COMPLEXITY_SCOPE_DESCRIPTIONS,
} from "@/features/complexity/labels";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

type Account = components["schemas"]["AccountItem"];

/**
 * The two estimation scales of the account — technical and product.
 *
 * Takes the loaded `account`, not an id: the form seeds itself from the current
 * modes on mount, so it must never render before they are known (a default-seeded
 * form would happily save "fibonacci" over the account's real scale).
 */
export function AccountComplexityModes({ account }: { account: Account }) {
  const { t } = useLingui();
  const queryClient = useQueryClient();

  const updateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}",
    {
      meta: { successMessage: t`Échelles mises à jour`, noErrorToast: true },
    }
  );

  const form = useAppForm({
    defaultValues: {
      technicalComplexityMode: account.technicalComplexityMode,
      productComplexityMode: account.productComplexityMode,
    },
    validators: {
      onSubmit: z.object({
        technicalComplexityMode: z.enum(dtoEnums.ComplexityMode),
        productComplexityMode: z.enum(dtoEnums.ComplexityMode),
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      try {
        await updateMutation.mutateAsync({
          params: { path: { account_id: account.id } },
          body: value,
        });
        queryClient.invalidateQueries({
          queryKey: ["get", "/v1/accounts/{account_id}"],
        });
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  // A scale is its label *and* the cards it offers: choosing between
  // "Fibonacci" and "Linéaire" means nothing without the values behind them.
  const modeOptions = dtoEnums.ComplexityMode.map((mode) => ({
    value: mode,
    label: `${t(COMPLEXITY_MODE_LABELS[mode])} — ${t(COMPLEXITY_MODE_DESCRIPTIONS[mode])}`,
  }));

  return (
    <Card
      title={
        <Typography.Text strong>{t`Échelles d'estimation`}</Typography.Text>
      }
    >
      <Flex gap={16} vertical>
        <Typography.Text type="secondary">
          {t`L'échelle sur laquelle les membres estiment la complexité. Les estimations déjà données gardent celle avec laquelle elles ont été posées.`}
        </Typography.Text>
        <form.AppForm>
          <form.FormRoot>
            <form.AppField name="technicalComplexityMode">
              {(field) => (
                <field.SelectField
                  label={`${t`Technique`} — ${t(COMPLEXITY_SCOPE_DESCRIPTIONS.technical)}`}
                  options={modeOptions}
                />
              )}
            </form.AppField>
            <form.AppField name="productComplexityMode">
              {(field) => (
                <field.SelectField
                  label={`${t`Produit`} — ${t(COMPLEXITY_SCOPE_DESCRIPTIONS.product)}`}
                  options={modeOptions}
                />
              )}
            </form.AppField>
            <div>
              <form.SubmitButton>{t`Enregistrer`}</form.SubmitButton>
            </div>
          </form.FormRoot>
        </form.AppForm>
      </Flex>
    </Card>
  );
}
