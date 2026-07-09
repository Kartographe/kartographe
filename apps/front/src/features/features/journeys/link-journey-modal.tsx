import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import { z } from "zod";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

type Journey = components["schemas"]["JourneyItem"];

interface LinkJourneyModalProps {
  accountId: string;
  featureId: string;
  /** The account's journeys not already linked to this feature. */
  journeys: Journey[];
  isLoading: boolean;
  open: boolean;
  onClose: () => void;
}

export function LinkJourneyModal({
  accountId,
  featureId,
  journeys,
  isLoading,
  open,
  onClose,
}: LinkJourneyModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();

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

  const options = journeys.map((journey) => ({
    value: journey.id,
    label: journey.title,
  }));

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
                loading={isLoading}
                options={options}
                placeholder={
                  options.length
                    ? t`Choisir un parcours`
                    : t`Tous les parcours sont déjà liés`
                }
              />
            )}
          </form.AppField>
          <form.SubmitButton block>{t`Lier le parcours`}</form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
