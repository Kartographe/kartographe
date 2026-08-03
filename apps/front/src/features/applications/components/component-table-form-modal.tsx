// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import { z } from "zod";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { formatVersion } from "@/features/databases/labels";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

type ComponentTable =
  components["schemas"]["ApplicationComponentDatabaseTableItem"];

const LIST_PATH =
  "/v1/accounts/{account_id}/applications/{application_id}/components/{component_id}/tables";
const ITEM_PATH =
  "/v1/accounts/{account_id}/applications/{application_id}/components/{component_id}/tables/{component_table_id}";

interface ComponentTableFormModalProps {
  accountId: string;
  applicationId: string;
  componentId: string;
  /** The link being edited; absent in create mode. */
  link?: ComponentTable;
  open: boolean;
  onClose: () => void;
}

/**
 * Pick a table of the account and describe what the component does with it.
 *
 * A table is only listable through its database *and* its version, so the
 * picker cascades: choosing a database loads its versions, choosing a version
 * loads its tables. Each step clears the ones below it — a table id from a
 * previously selected version would be a link to something the user did not
 * mean.
 */
export function ComponentTableFormModal({
  accountId,
  applicationId,
  componentId,
  link,
  open,
  onClose,
}: ComponentTableFormModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const isEdit = !!link;

  const path = {
    account_id: accountId,
    application_id: applicationId,
    component_id: componentId,
  };

  const createMutation = $api.useMutation("post", LIST_PATH, {
    meta: { successMessage: t`Table liée`, noErrorToast: true },
  });
  const updateMutation = $api.useMutation("patch", ITEM_PATH, {
    meta: { successMessage: t`Liaison mise à jour`, noErrorToast: true },
  });

  const form = useAppForm({
    defaultValues: {
      databaseId: link?.databaseId ?? "",
      databaseVersionId: link?.databaseVersionId ?? "",
      databaseTableId: link?.databaseTableId ?? "",
      description: link?.description ?? null,
    },
    validators: {
      onSubmit: z.object({
        databaseId: z.string().min(1, t`La base de données est requise`),
        databaseVersionId: z.string().min(1, t`La version est requise`),
        databaseTableId: z.string().min(1, t`La table est requise`),
        description: z.record(z.string(), z.unknown()).nullable(),
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      const body = {
        databaseTableId: value.databaseTableId,
        description: value.description,
      };
      try {
        if (link) {
          await updateMutation.mutateAsync({
            params: { path: { ...path, component_table_id: link.id } },
            body,
          });
        } else {
          await createMutation.mutateAsync({ params: { path }, body });
        }
        queryClient.invalidateQueries({ queryKey: ["get", LIST_PATH] });
        formApi.reset();
        onClose();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  const databaseId = form.state.values.databaseId;
  const databaseVersionId = form.state.values.databaseVersionId;

  const databasesQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases",
    { params: { path: { account_id: accountId } } }
  );
  const versionsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases/{database_id}/versions",
    {
      params: {
        path: { account_id: accountId, database_id: databaseId },
      },
    },
    { enabled: !!databaseId }
  );
  const tablesQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/databases/{database_id}/versions/{database_version_id}/tables",
    {
      params: {
        path: {
          account_id: accountId,
          database_id: databaseId,
          database_version_id: databaseVersionId,
        },
      },
    },
    { enabled: !!(databaseId && databaseVersionId) }
  );

  const databaseOptions = (databasesQuery.data?.items ?? []).map(
    (database) => ({ value: database.id, label: database.title })
  );
  const versionOptions = (versionsQuery.data?.items ?? []).map((version) => ({
    value: version.id,
    label: formatVersion(version.version),
  }));
  const tableOptions = (tablesQuery.data?.items ?? []).map((table) => ({
    value: table.id,
    label: `${table.schema}.${table.name}`,
  }));

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={isEdit ? t`Modifier la liaison` : t`Lier une table`}
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="databaseId">
            {(field) => (
              <field.SelectField
                label={t`Base de données`}
                loading={databasesQuery.isLoading}
                onChange={() => {
                  form.setFieldValue("databaseVersionId", "");
                  form.setFieldValue("databaseTableId", "");
                }}
                options={databaseOptions}
                placeholder={t`Choisir une base`}
              />
            )}
          </form.AppField>
          <form.AppField name="databaseVersionId">
            {(field) => (
              <field.SelectField
                disabled={!databaseId}
                label={t`Version`}
                loading={versionsQuery.isLoading}
                onChange={() => form.setFieldValue("databaseTableId", "")}
                options={versionOptions}
                placeholder={t`Choisir une version`}
              />
            )}
          </form.AppField>
          <form.AppField name="databaseTableId">
            {(field) => (
              <field.SelectField
                disabled={!databaseVersionId}
                label={t`Table`}
                loading={tablesQuery.isLoading}
                options={tableOptions}
                placeholder={t`Choisir une table`}
              />
            )}
          </form.AppField>
          <form.AppField name="description">
            {(field) => (
              <field.RichTextField
                label={t`Description`}
                placeholder={t`Que fait ce composant avec cette table ?`}
              />
            )}
          </form.AppField>
          <form.SubmitButton block>
            {isEdit ? t`Enregistrer` : t`Lier la table`}
          </form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
