import { EditOutlined, InboxOutlined, RocketOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Descriptions, Flex, Space, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { useAccountUserMap } from "@/features/accounts/use-account-user-map";
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
  const users = useAccountUserMap(accountId);

  const activateMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/databases/{database_id}/activate",
    { meta: { successMessage: t`Base de données activée` } }
  );
  const archiveMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/databases/{database_id}/archive",
    { meta: { successMessage: t`Base de données archivée` } }
  );

  // Only an active entity can be archived; a draft or archived one is activated.
  const isActive = database.status === "active";

  async function toggleStatus() {
    const params = {
      path: { account_id: accountId, database_id: database.id },
    };
    if (isActive) {
      await archiveMutation.mutateAsync({ params });
    } else {
      await activateMutation.mutateAsync({ params });
    }
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
        <Descriptions.Item label={t`Titre`}>{database.title}</Descriptions.Item>
        <Descriptions.Item label={t`Moteur`}>
          <DatabaseTypeTag type={database.type} />
        </Descriptions.Item>
        <Descriptions.Item label={t`Statut`}>
          <DatabaseStatusTag status={database.status} />
        </Descriptions.Item>
        <Descriptions.Item label={t`Description`}>
          <RichTextView value={database.description} />
        </Descriptions.Item>
        <Descriptions.Item label={t`Propriétaire`}>
          {users.name(database.ownerId)}
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
