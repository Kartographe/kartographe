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
import { useAccountUserMap } from "@/features/accounts/use-account-user-map";
import { ApplicationFormModal } from "@/features/applications/application-form-modal";
import {
  ApplicationStatusTag,
  ApplicationTypeTag,
} from "@/features/applications/application-tags";

type Application = components["schemas"]["ApplicationItem"];

export function ApplicationOverview({
  accountId,
  application,
}: {
  accountId: string;
  application: Application;
}) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const users = useAccountUserMap(accountId);

  const statusMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/applications/{application_id}",
    { meta: { successMessage: t`Statut mis à jour` } }
  );
  const typeMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/applications/{application_id}",
    { meta: { successMessage: t`Type mis à jour` } }
  );

  async function changeStatus(status: Application["status"]) {
    await statusMutation.mutateAsync({
      params: {
        path: { account_id: accountId, application_id: application.id },
      },
      body: { status },
    });
    queryClient.invalidateQueries({
      queryKey: [
        "get",
        "/v1/accounts/{account_id}/applications/{application_id}",
      ],
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/applications"],
    });
  }

  async function changeType(type: Application["type"]) {
    await typeMutation.mutateAsync({
      params: {
        path: { account_id: accountId, application_id: application.id },
      },
      body: { type },
    });
    queryClient.invalidateQueries({
      queryKey: [
        "get",
        "/v1/accounts/{account_id}/applications/{application_id}",
      ],
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/applications"],
    });
  }

  return (
    <Flex gap={16} vertical>
      <Flex align="center" justify="space-between">
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t`Vue d'ensemble`}
        </Typography.Title>
        <Space>
          <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>
            {t`Modifier`}
          </Button>
        </Space>
      </Flex>

      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label={t`Titre`}>
          {application.title}
        </Descriptions.Item>
        <Descriptions.Item label={t`Type`}>
          <ApplicationTypeTag
            loading={typeMutation.isPending}
            onChange={changeType}
            type={application.type}
          />
        </Descriptions.Item>
        <Descriptions.Item label={t`Statut`}>
          <ApplicationStatusTag
            loading={statusMutation.isPending}
            onChange={changeStatus}
            status={application.status}
          />
        </Descriptions.Item>
        <Descriptions.Item label={t`Description`}>
          {application.description || "—"}
        </Descriptions.Item>
        <Descriptions.Item label={t`Propriétaire`}>
          {users.name(application.ownerId)}
        </Descriptions.Item>
        <Descriptions.Item label={t`Créée le`}>
          {dayjs(application.date).format("DD/MM/YYYY HH:mm")}
        </Descriptions.Item>
        <Descriptions.Item label={t`Statut modifié le`}>
          {dayjs(application.statusDate).format("DD/MM/YYYY HH:mm")}
        </Descriptions.Item>
      </Descriptions>

      <ApplicationFormModal
        accountId={accountId}
        application={application}
        onClose={() => setEditOpen(false)}
        open={editOpen}
      />
    </Flex>
  );
}
