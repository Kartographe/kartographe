import { useLingui } from "@lingui/react/macro";
import { useStore } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import { z } from "zod";
import { $api } from "@/api/$api";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

/** Matches the pickers: an account with more applications pages beyond it. */
const APPLICATIONS_LIMIT = 100;

interface LinkRouteModalProps {
  accountId: string;
  journeyId: string;
  scenarioId: string;
  stepId: string;
  open: boolean;
  onClose: () => void;
}

export function LinkRouteModal({
  accountId,
  journeyId,
  scenarioId,
  stepId,
  open,
  onClose,
}: LinkRouteModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const path = {
    account_id: accountId,
    journey_id: journeyId,
    scenario_id: scenarioId,
    step_id: stepId,
  };

  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps/{step_id}/routes",
    { meta: { successMessage: t`Route liée`, noErrorToast: true } }
  );

  const form = useAppForm({
    defaultValues: { applicationId: "", applicationRouteId: "" },
    validators: {
      onSubmit: z.object({
        applicationId: z.string().min(1, t`L'application est requise`),
        applicationRouteId: z.string().min(1, t`La route est requise`),
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      try {
        await createMutation.mutateAsync({
          params: { path },
          body: {
            applicationId: value.applicationId,
            applicationRouteId: value.applicationRouteId,
          },
        });
        queryClient.invalidateQueries({
          queryKey: [
            "get",
            "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps/{step_id}/routes",
          ],
        });
        formApi.reset();
        onClose();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  const applicationId = useStore(
    form.store,
    (state) => state.values.applicationId
  );

  const applicationsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/applications",
    {
      params: {
        path: { account_id: accountId },
        query: { limit: APPLICATIONS_LIMIT },
      },
    }
  );
  // A route only exists inside its application, so the picker waits for one.
  const routesQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/applications/{application_id}/routes",
    {
      params: {
        path: { account_id: accountId, application_id: applicationId },
      },
    },
    { enabled: !!applicationId }
  );

  const applicationOptions = (applicationsQuery.data?.items ?? []).map(
    (application) => ({ value: application.id, label: application.title })
  );
  const routeOptions = (routesQuery.data?.items ?? []).map((route) => ({
    value: route.id,
    label: `${route.method} ${route.path}`,
  }));

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={t`Lier une route`}
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="applicationId">
            {(field) => (
              <field.SelectField
                label={t`Application`}
                loading={applicationsQuery.isLoading}
                onChange={() => {
                  // The route belongs to the previous application.
                  form.setFieldValue("applicationRouteId", "");
                }}
                options={applicationOptions}
              />
            )}
          </form.AppField>
          <form.AppField name="applicationRouteId">
            {(field) => (
              <field.SelectField
                disabled={!applicationId}
                label={t`Route`}
                loading={routesQuery.isLoading}
                options={routeOptions}
              />
            )}
          </form.AppField>
          <form.SubmitButton block>{t`Lier la route`}</form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
