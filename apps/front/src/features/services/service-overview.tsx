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
import { ServiceFormModal } from "@/features/services/service-form-modal";
import {
  ServiceStatusTag,
  ServiceTypeTag,
} from "@/features/services/service-tags";
import { RichTextView } from "@/lib/rich-text/rich-text-view";

type Service = components["schemas"]["ServiceItem"];

function ExternalLink({ url }: { url: string }) {
  return (
    <Typography.Link href={url} rel="noreferrer" target="_blank">
      {url}
    </Typography.Link>
  );
}

export function ServiceOverview({
  accountId,
  service,
}: {
  accountId: string;
  service: Service;
}) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const users = useAccountUserMap(accountId);

  const statusMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/services/{service_id}",
    { meta: { successMessage: t`Statut mis à jour` } }
  );

  async function changeStatus(status: Service["status"]) {
    await statusMutation.mutateAsync({
      params: { path: { account_id: accountId, service_id: service.id } },
      body: { status },
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/services/{service_id}"],
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/services"],
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
        <Descriptions.Item label={t`Titre`}>{service.title}</Descriptions.Item>
        <Descriptions.Item label={t`Type`}>
          <ServiceTypeTag type={service.type} />
        </Descriptions.Item>
        <Descriptions.Item label={t`Statut`}>
          <ServiceStatusTag
            loading={statusMutation.isPending}
            onChange={changeStatus}
            status={service.status}
          />
        </Descriptions.Item>
        <Descriptions.Item label={t`URL`}>
          {service.url ? <ExternalLink url={service.url} /> : "—"}
        </Descriptions.Item>
        <Descriptions.Item label={t`URL OpenAPI`}>
          {service.openapiUrl ? <ExternalLink url={service.openapiUrl} /> : "—"}
        </Descriptions.Item>
        <Descriptions.Item label={t`Description`}>
          <RichTextView value={service.description} />
        </Descriptions.Item>
        <Descriptions.Item label={t`Propriétaire`}>
          {users.name(service.ownerId)}
        </Descriptions.Item>
        <Descriptions.Item label={t`Créé le`}>
          {dayjs(service.date).format("DD/MM/YYYY HH:mm")}
        </Descriptions.Item>
        <Descriptions.Item label={t`Statut modifié le`}>
          {dayjs(service.statusDate).format("DD/MM/YYYY HH:mm")}
        </Descriptions.Item>
      </Descriptions>

      <ServiceFormModal
        accountId={accountId}
        onClose={() => setEditOpen(false)}
        open={editOpen}
        service={service}
      />
    </Flex>
  );
}
