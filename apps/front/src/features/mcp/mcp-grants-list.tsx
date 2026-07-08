import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { App, Button, Empty, Flex, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { MCP_SCOPE_COLORS } from "@/features/mcp/labels";

type Grant = components["schemas"]["MeMCPGrantItem"];

export function MCPGrantsList() {
  const { t } = useLingui();
  const { modal } = App.useApp();
  const queryClient = useQueryClient();

  const grantsQuery = $api.useQuery("get", "/me/mcp/grants");
  const revokeMutation = $api.useMutation(
    "delete",
    "/me/mcp/grants/{grant_id}",
    {
      meta: { successMessage: t`Application déconnectée` },
    }
  );

  const scopeLabel = (scope: string) =>
    scope === "write" ? t`Accès complet` : t`Lecture seule`;

  function confirmRevoke(grant: Grant) {
    modal.confirm({
      title: t`Déconnecter ${grant.clientName} ?`,
      content: t`L'application perdra immédiatement l'accès à votre compte.`,
      okText: t`Déconnecter`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await revokeMutation.mutateAsync({
          params: { path: { grant_id: grant.id } },
        });
        queryClient.invalidateQueries({ queryKey: ["get", "/me/mcp/grants"] });
      },
    });
  }

  const grants = grantsQuery.data?.items ?? [];

  return (
    <Flex gap={16} vertical>
      <Typography.Title level={3} style={{ margin: 0 }}>
        {t`Applications connectées`}
      </Typography.Title>
      {grants.length === 0 && !grantsQuery.isLoading ? (
        <Empty description={t`Aucune application connectée`} />
      ) : (
        <Table<Grant>
          columns={[
            {
              title: t`Application`,
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
                <Tag color={MCP_SCOPE_COLORS[scope]}>{scopeLabel(scope)}</Tag>
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
