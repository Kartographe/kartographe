// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { EditOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Flex } from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import {
  OverviewField,
  OverviewFields,
} from "@/components/overview/overview-fields";
import { OverviewHeader } from "@/components/overview/overview-header";
import { DatabaseFormModal } from "@/features/databases/database-form-modal";
import {
  DatabaseStatusTag,
  DatabaseTypeTag,
} from "@/features/databases/database-tags";
import { RichTextView } from "@/lib/rich-text/rich-text-view";

type Database = components["schemas"]["DatabaseItem"];

export function DatabaseOverview({
  accountId,
  database,
}: {
  accountId: string;
  database: Database;
}) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const statusMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/databases/{database_id}",
    { meta: { successMessage: t`Statut mis à jour` } }
  );
  const typeMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/databases/{database_id}",
    { meta: { successMessage: t`Type mis à jour` } }
  );

  async function changeStatus(status: Database["status"]) {
    await statusMutation.mutateAsync({
      params: {
        path: { account_id: accountId, database_id: database.id },
      },
      body: { status },
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/databases/{database_id}"],
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/databases"],
    });
  }

  async function changeType(type: Database["type"]) {
    await typeMutation.mutateAsync({
      params: {
        path: { account_id: accountId, database_id: database.id },
      },
      body: { type },
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/databases/{database_id}"],
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/databases"],
    });
  }

  return (
    <Flex gap={16} vertical>
      <OverviewHeader
        actions={
          <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>
            {t`Modifier`}
          </Button>
        }
        date={database.date}
        owner={database.owner}
        statusDate={database.statusDate}
        title={t`Informations`}
      />

      <OverviewFields>
        <OverviewField label={t`Titre`}>{database.title}</OverviewField>
        <OverviewField label={t`Moteur`}>
          <DatabaseTypeTag
            loading={typeMutation.isPending}
            onChange={changeType}
            type={database.type}
          />
        </OverviewField>
        <OverviewField label={t`Statut`}>
          <DatabaseStatusTag
            loading={statusMutation.isPending}
            onChange={changeStatus}
            status={database.status}
          />
        </OverviewField>
        <OverviewField full label={t`Description`}>
          <RichTextView value={database.description} />
        </OverviewField>
      </OverviewFields>

      <DatabaseFormModal
        accountId={accountId}
        database={database}
        onClose={() => setEditOpen(false)}
        open={editOpen}
      />
    </Flex>
  );
}
