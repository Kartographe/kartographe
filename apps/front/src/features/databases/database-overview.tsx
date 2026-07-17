// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { EditOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Descriptions, Flex, Space, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { OwnerCell } from "@/features/accounts/owner-cell";
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
      <Flex align="center" justify="space-between">
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t`Informations`}
        </Typography.Title>
        <Space>
          <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>
            {t`Modifier`}
          </Button>
        </Space>
      </Flex>

      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label={t`Titre`}>{database.title}</Descriptions.Item>
        <Descriptions.Item label={t`Moteur`}>
          <DatabaseTypeTag
            loading={typeMutation.isPending}
            onChange={changeType}
            type={database.type}
          />
        </Descriptions.Item>
        <Descriptions.Item label={t`Statut`}>
          <DatabaseStatusTag
            loading={statusMutation.isPending}
            onChange={changeStatus}
            status={database.status}
          />
        </Descriptions.Item>
        <Descriptions.Item label={t`Description`}>
          <RichTextView value={database.description} />
        </Descriptions.Item>
        <Descriptions.Item label={t`Propriétaire`}>
          <OwnerCell owner={database.owner} />
        </Descriptions.Item>
        <Descriptions.Item label={t`Créée le`}>
          {dayjs(database.date).format("DD/MM/YYYY HH:mm")}
        </Descriptions.Item>
        <Descriptions.Item label={t`Statut modifié le`}>
          {dayjs(database.statusDate).format("DD/MM/YYYY HH:mm")}
        </Descriptions.Item>
      </Descriptions>

      <DatabaseFormModal
        accountId={accountId}
        database={database}
        onClose={() => setEditOpen(false)}
        open={editOpen}
      />
    </Flex>
  );
}
