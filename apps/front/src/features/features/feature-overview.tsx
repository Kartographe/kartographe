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
import { FeatureFormModal } from "@/features/features/feature-form-modal";
import {
  FeatureStatusTag,
  FeatureTypeTag,
} from "@/features/features/feature-tags";
import { RichTextView } from "@/lib/rich-text/rich-text-view";

type Feature = components["schemas"]["FeatureItem"];

export function FeatureOverview({
  accountId,
  feature,
}: {
  accountId: string;
  feature: Feature;
}) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const users = useAccountUserMap(accountId);

  const statusMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/features/{feature_id}",
    { meta: { successMessage: t`Statut mis à jour` } }
  );

  async function changeStatus(status: Feature["status"]) {
    await statusMutation.mutateAsync({
      params: { path: { account_id: accountId, feature_id: feature.id } },
      body: { status },
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/features/{feature_id}"],
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/features"],
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
        <Descriptions.Item label={t`Titre`}>{feature.title}</Descriptions.Item>
        <Descriptions.Item label={t`Type`}>
          <FeatureTypeTag type={feature.type} />
        </Descriptions.Item>
        <Descriptions.Item label={t`Statut`}>
          <FeatureStatusTag
            loading={statusMutation.isPending}
            onChange={changeStatus}
            status={feature.status}
          />
        </Descriptions.Item>
        <Descriptions.Item label={t`Description`}>
          <RichTextView value={feature.description} />
        </Descriptions.Item>
        <Descriptions.Item label={t`Propriétaire`}>
          {users.name(feature.ownerId)}
        </Descriptions.Item>
        <Descriptions.Item label={t`Créée le`}>
          {dayjs(feature.date).format("DD/MM/YYYY HH:mm")}
        </Descriptions.Item>
        <Descriptions.Item label={t`Statut modifié le`}>
          {dayjs(feature.statusDate).format("DD/MM/YYYY HH:mm")}
        </Descriptions.Item>
      </Descriptions>

      <FeatureFormModal
        accountId={accountId}
        feature={feature}
        onClose={() => setEditOpen(false)}
        open={editOpen}
      />
    </Flex>
  );
}
