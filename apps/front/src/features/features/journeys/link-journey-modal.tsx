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

interface LinkJourneyModalProps {
  accountId: string;
  featureId: string;
  /** Already-linked ids, filtered out of whatever the search brings back. */
  linkedIds: Set<string>;
  open: boolean;
  onClose: () => void;
}

export function LinkJourneyModal({
  accountId,
  featureId,
  linkedIds,
  open,
  onClose,
}: LinkJourneyModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  // Searching server-side rather than filtering a first page client-side: an
  // account past the page size would otherwise have journeys the picker can
  // never reach.
  const journeysQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/journeys",
    {
      params: {
        path: { account_id: accountId },
        query: { limit: SEARCH_LIMIT, ...(search ? { q: search } : {}) },
      },
    }
  );

  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/features/{feature_id}/journeys",
    { meta: { successMessage: t`Parcours lié`, noErrorToast: true } }
  );

  const form = useAppForm({
    defaultValues: { journeyId: "" },
    validators: {
      onSubmit: z.object({
        journeyId: z.string().min(1, t`Le parcours est requis`),
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      try {
        await createMutation.mutateAsync({
          params: { path: { account_id: accountId, feature_id: featureId } },
          body: { journeyId: value.journeyId },
        });
        queryClient.invalidateQueries({
          queryKey: [
            "get",
            "/v1/accounts/{account_id}/features/{feature_id}/journeys",
          ],
        });
        formApi.reset();
        onClose();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  const options = (journeysQuery.data?.items ?? [])
    .filter((journey) => !linkedIds.has(journey.id))
    .map((journey) => ({ value: journey.id, label: journey.title }));

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={t`Lier un parcours`}
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="journeyId">
            {(field) => (
              <field.SelectField
                label={t`Parcours utilisateur`}
                loading={journeysQuery.isLoading}
                onSearch={setSearch}
                options={options}
                placeholder={t`Rechercher un parcours`}
              />
            )}
          </form.AppField>
          <form.SubmitButton block>{t`Lier le parcours`}</form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
