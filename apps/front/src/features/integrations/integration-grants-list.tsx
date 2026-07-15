import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { App, Button, Empty, Flex, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { SCOPE_COLORS } from "@/features/integrations/labels";

type Grant = components["schemas"]["MeIntegrationGrantItem"];

export function IntegrationGrantsList() {
  const { t } = useLingui();
  const { modal } = App.useApp();
  const queryClient = useQueryClient();

  const grantsQuery = $api.useQuery("get", "/me/integrations/grants");
  const revokeMutation = $api.useMutation(
    "delete",
    "/me/integrations/grants/{grant_id}",
    {
      meta: { successMessage: t`Intégration déconnectée` },
    }
  );

  const scopeLabel = (scope: string) =>
    scope === "write" ? t`Accès complet` : t`Lecture seule`;

  function confirmRevoke(grant: Grant) {
    modal.confirm({
      title: t`Déconnecter ${grant.clientName} ?`,
      content: t`L'intégration perdra immédiatement l'accès à votre compte.`,
      okText: t`Déconnecter`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await revokeMutation.mutateAsync({
          params: { path: { grant_id: grant.id } },
        });
        queryClient.invalidateQueries({
          queryKey: ["get", "/me/integrations/grants"],
        });
      },
    });
  }

  const grants = grantsQuery.data?.items ?? [];

  return (
    <Flex gap={16} vertical>
      <Typography.Title level={3} style={{ margin: 0 }}>
        {t`Intégrations connectées`}
      </Typography.Title>
      {grants.length === 0 && !grantsQuery.isLoading ? (
        <Empty description={t`Aucune intégration connectée`} />
      ) : (
        <Table<Grant>
          columns={[
            {
              title: t`Intégration`,
              dataIndex: "clientName",
              render: (name: string, grant) => (
                <Flex vertical>
                  <Typography.Text strong>{name}</Typography.Text>
                  <Typography.Text style={{ fontSize: 12 }} type="secondary">
                    {grant.clientId.slice(0, 8)}
                  </Typography.Text>
                </Flex>
              ),
            },
            {
              title: t`Accès`,
              dataIndex: "scope",
              render: (scope: string) => (
                <Tag color={SCOPE_COLORS[scope]}>{scopeLabel(scope)}</Tag>
              ),
            },
            {
              title: t`Connectée le`,
              dataIndex: "connectedAt",
              render: (value: string | null) =>
                value ? dayjs(value).format("DD/MM/YYYY") : "—",
            },
            {
              title: t`Dernière utilisation`,
              dataIndex: "lastUsedAt",
              render: (value: string | null) =>
                value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "—",
            },
            {
              title: "",
              key: "actions",
              render: (_, grant) => (
                <Button
                  danger
                  onClick={() => confirmRevoke(grant)}
                  size="small"
                >
                  {t`Déconnecter`}
                </Button>
              ),
            },
          ]}
          dataSource={grants}
          loading={grantsQuery.isLoading}
          pagination={false}
          rowKey="id"
          size="small"
        />
      )}
    </Flex>
  );
}
