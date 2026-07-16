// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import { z } from "zod";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { formatVersion, parseVersion } from "@/features/databases/labels";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

type DatabaseVersion = components["schemas"]["DatabaseVersionItem"];

interface VersionFormModalProps {
  accountId: string;
  databaseId: string;
  version?: DatabaseVersion;
  open: boolean;
  onClose: () => void;
}

export function VersionFormModal({
  accountId,
  databaseId,
  version,
  open,
  onClose,
}: VersionFormModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const isEdit = !!version;
  const path = { account_id: accountId, database_id: databaseId };

  const createMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/databases/{database_id}/versions",
    { meta: { successMessage: t`Version créée`, noErrorToast: true } }
  );
  const updateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}",
    { meta: { successMessage: t`Version mise à jour`, noErrorToast: true } }
  );

  const form = useAppForm({
    defaultValues: {
      // `[1, 2, 0]` is edited as the "1.2.0" everyone reads it as.
      version: version ? version.version.join(".") : "",
    },
    validators: {
      onSubmit: z.object({
        version: z
          .string()
          .refine((value) => parseVersion(value) !== null, t`Version invalide`),
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      const parsed = parseVersion(value.version);
      if (!parsed) {
        return;
      }
      const body = { version: parsed };
      try {
        if (version) {
          await updateMutation.mutateAsync({
            params: { path: { ...path, database_version_id: version.id } },
            body,
          });
        } else {
          await createMutation.mutateAsync({ params: { path }, body });
        }
        queryClient.invalidateQueries({
          queryKey: [
            "get",
            "/v1/accounts/{account_id}/databases/{database_id}/versions",
          ],
        });
        formApi.reset();
        onClose();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={
        isEdit
          ? t`Modifier ${formatVersion(version.version)}`
          : t`Créer une version`
      }
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="version">
            {(field) => (
              <field.TextField label={t`Version`} placeholder="1.0.0" />
            )}
          </form.AppField>
          <form.SubmitButton block>
            {isEdit ? t`Enregistrer` : t`Créer la version`}
          </form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
