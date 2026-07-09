import { EditOutlined, InboxOutlined, RocketOutlined } from "@ant-design/icons";
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

  const activateMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/features/{feature_id}/activate",
    { meta: { successMessage: t`Fonctionnalité activée` } }
  );
  const archiveMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/features/{feature_id}/archive",
    { meta: { successMessage: t`Fonctionnalité archivée` } }
  );

  const isArchived = feature.status === "archived";

  async function toggleStatus() {
    const params = { path: { account_id: accountId, feature_id: feature.id } };
    if (isArchived) {
      await activateMutation.mutateAsync({ params });
    } else {
      await archiveMutation.mutateAsync({ params });
    }
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
          <Button
            icon={isArchived ? <RocketOutlined /> : <InboxOutlined />}
            loading={activateMutation.isPending || archiveMutation.isPending}
            onClick={toggleStatus}
          >
            {isArchived ? t`Activer` : t`Archiver`}
          </Button>
        </Space>
      </Flex>

      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label={t`Titre`}>{feature.title}</Descriptions.Item>
        <Descriptions.Item label={t`Type`}>
          <FeatureTypeTag type={feature.type} />
        </Descriptions.Item>
        <Descriptions.Item label={t`Statut`}>
          <FeatureStatusTag status={feature.status} />
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
