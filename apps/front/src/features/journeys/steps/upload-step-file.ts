import { fetchClient } from "@/api/client";

/**
 * Uploads a file onto a scenario step.
 *
 * The route takes `multipart/form-data`, which `$api.useMutation` cannot express
 * — openapi-typescript renders the binary field as a `string`, and the value the
 * request actually needs is the `File`. Hence the cast and the explicit
 * serializer, both confined to this one function (see `uploadFeatureFile`).
 */
export async function uploadStepFile({
  accountId,
  journeyId,
  scenarioId,
  stepId,
  file,
}: {
  accountId: string;
  journeyId: string;
  scenarioId: string;
  stepId: string;
  file: File;
}) {
  const { data, error } = await fetchClient.POST(
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps/{step_id}/files",
    {
      params: {
        path: {
          account_id: accountId,
          journey_id: journeyId,
          scenario_id: scenarioId,
          step_id: stepId,
        },
      },
      body: { file: file as unknown as string },
      bodySerializer(body) {
        const form = new FormData();
        form.append("file", body.file as unknown as File);
        return form;
      },
    }
  );
  if (error) {
    throw error;
  }
  return data;
}
