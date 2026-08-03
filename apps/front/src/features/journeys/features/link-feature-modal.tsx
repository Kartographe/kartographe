// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import { useState } from "react";
import { z } from "zod";
import { $api } from "@/api/$api";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

/** One page is plenty next to a search box; the query narrows, not the page. */
const SEARCH_LIMIT = 25;

interface LinkFeatureModalProps {
  accountId: string;
  journeyId: string;
  /** Already-linked ids, filtered out of whatever the search brings back. */
  linkedIds: Set<string>;
  open: boolean;
  onClose: () => void;
}

export function LinkFeatureModal({
  accountId,
  journeyId,
  linkedIds,
  open,
  onClose,
}: LinkFeatureModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  // Searching server-side rather than filtering a first page client-side: an
  // account past the page size would otherwise have features the picker can
  // never reach.
  const featuresQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/features",
    {
      params: {
        path: { account_id: accountId },
        query: { limit: SEARCH_LIMIT, ...(search ? { q: search } : {}) },
      },
    }
  );

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

  const options = (featuresQuery.data?.items ?? [])
    .filter((feature) => !linkedIds.has(feature.id))
    .map((feature) => ({ value: feature.id, label: feature.title }));

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
                loading={featuresQuery.isLoading}
                onSearch={setSearch}
                options={options}
                placeholder={t`Rechercher une fonctionnalité`}
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
