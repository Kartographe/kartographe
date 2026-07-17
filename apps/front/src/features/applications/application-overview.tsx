// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { EditOutlined, InboxOutlined, RocketOutlined } from "@ant-design/icons";
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

  const activateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/applications/{application_id}",
    { meta: { successMessage: t`Application activée` } }
  );
  const archiveMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/applications/{application_id}",
    { meta: { successMessage: t`Application archivée` } }
  );

  // Only an active entity can be archived; a draft or archived one is activated.
  const isActive = application.status === "active";

  async function toggleStatus() {
    const params = {
      path: { account_id: accountId, application_id: application.id },
    };
    if (isActive) {
      await archiveMutation.mutateAsync({
        params,
        body: { status: "archived" },
      });
    } else {
      await activateMutation.mutateAsync({
        params,
        body: { status: "active" },
      });
    }
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
          <Button
            icon={isActive ? <InboxOutlined /> : <RocketOutlined />}
            loading={activateMutation.isPending || archiveMutation.isPending}
            onClick={toggleStatus}
          >
            {isActive ? t`Archiver` : t`Activer`}
          </Button>
        </Space>
      </Flex>

      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label={t`Titre`}>
          {application.title}
        </Descriptions.Item>
        <Descriptions.Item label={t`Type`}>
          <ApplicationTypeTag type={application.type} />
        </Descriptions.Item>
        <Descriptions.Item label={t`Statut`}>
          <ApplicationStatusTag status={application.status} />
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
