// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { fetchClient } from "@/api/client";

/**
 * Uploads a file onto a feature.
 *
 * The route takes `multipart/form-data`, which `$api.useMutation` cannot express
 * — openapi-typescript renders the binary field as a `string`, and the value the
 * request actually needs is the `File`. Hence the cast and the explicit
 * serializer, both confined to this one function.
 */
export async function uploadFeatureFile({
  accountId,
  featureId,
  file,
}: {
  accountId: string;
  featureId: string;
  file: File;
}) {
  const { data, error } = await fetchClient.POST(
    "/v1/accounts/{account_id}/features/{feature_id}/files",
    {
      params: { path: { account_id: accountId, feature_id: featureId } },
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
