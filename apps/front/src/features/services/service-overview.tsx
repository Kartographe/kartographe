import { EditOutlined, InboxOutlined, RocketOutlined } from "@ant-design/icons";
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

  const activateMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/services/{service_id}/activate",
    { meta: { successMessage: t`Service activé` } }
  );
  const archiveMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/services/{service_id}/archive",
    { meta: { successMessage: t`Service archivé` } }
  );

  const isArchived = service.status === "archived";

  async function toggleStatus() {
    const params = { path: { account_id: accountId, service_id: service.id } };
    if (isArchived) {
      await activateMutation.mutateAsync({ params });
    } else {
      await archiveMutation.mutateAsync({ params });
    }
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
        <Descriptions.Item label={t`Titre`}>{service.title}</Descriptions.Item>
        <Descriptions.Item label={t`Type`}>
          <ServiceTypeTag type={service.type} />
        </Descriptions.Item>
        <Descriptions.Item label={t`Statut`}>
          <ServiceStatusTag status={service.status} />
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
