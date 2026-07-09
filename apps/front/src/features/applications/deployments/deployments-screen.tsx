import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  RocketOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Empty,
  Flex,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { useAccountUserMap } from "@/features/accounts/use-account-user-map";
import { DeploymentStatusTag } from "@/features/applications/application-tags";
import { formatVersion } from "@/features/applications/version";

type Deployment = components["schemas"]["ApplicationEnvironmentVersionItem"];

const LIST_KEY = [
  "get",
  "/v1/accounts/{account_id}/applications/{application_id}/environments/{environment_id}/versions",
];

export function DeploymentsScreen({
  accountId,
  applicationId,
}: {
  accountId: string;
  applicationId: string;
}) {
  const { t } = useLingui();
  const { modal } = App.useApp();
  const queryClient = useQueryClient();
  const users = useAccountUserMap(accountId);

  const [environmentId, setEnvironmentId] = useState<string | undefined>();
  const [deployOpen, setDeployOpen] = useState(false);
  const [versionId, setVersionId] = useState<string | undefined>();
  const [errorTarget, setErrorTarget] = useState<Deployment | undefined>();
  const [errorDetails, setErrorDetails] = useState("");

  const path = { account_id: accountId, application_id: applicationId };

  const environmentsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/applications/{application_id}/environments",
    { params: { path } }
  );
  const versionsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/applications/{application_id}/versions",
    { params: { path } }
  );

  const environments = environmentsQuery.data?.items ?? [];
  const versions = versionsQuery.data?.items ?? [];
  const selectedEnvironmentId = environmentId ?? environments[0]?.id;

  const deploymentsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/applications/{application_id}/environments/{environment_id}/versions",
    {
      params: {
        path: { ...path, environment_id: selectedEnvironmentId ?? "" },
      },
    },
    { enabled: !!selectedEnvironmentId }
  );

  const deployMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/applications/{application_id}/environments/{environment_id}/versions",
    { meta: { successMessage: t`Déploiement démarré` } }
  );
  const finishedMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/applications/{application_id}/environments/{environment_id}/versions/{environment_version_id}/finished",
    { meta: { successMessage: t`Déploiement marqué comme terminé` } }
  );
  const errorMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/applications/{application_id}/environments/{environment_id}/versions/{environment_version_id}/error",
    { meta: { successMessage: t`Déploiement marqué en erreur` } }
  );
  const cancelledMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/applications/{application_id}/environments/{environment_id}/versions/{environment_version_id}/cancelled",
    { meta: { successMessage: t`Déploiement annulé` } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/applications/{application_id}/environments/{environment_id}/versions/{environment_version_id}",
    { meta: { successMessage: t`Déploiement supprimé` } }
  );

  const deployments = deploymentsQuery.data?.items ?? [];
  const versionLabels = new Map(
    versions.map((version) => [
      version.id,
      `${formatVersion(version.version)} — ${version.title}`,
    ])
  );

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
  }

  function deploymentPath(deployment: Deployment) {
    return {
      ...path,
      environment_id: selectedEnvironmentId ?? "",
      environment_version_id: deployment.id,
    };
  }

  async function deploy() {
    if (!(selectedEnvironmentId && versionId)) {
      return;
    }
    await deployMutation.mutateAsync({
      params: { path: { ...path, environment_id: selectedEnvironmentId } },
      body: { applicationVersionId: versionId },
    });
    setDeployOpen(false);
    setVersionId(undefined);
    invalidate();
  }

  async function markFinished(deployment: Deployment) {
    await finishedMutation.mutateAsync({
      params: { path: deploymentPath(deployment) },
    });
    invalidate();
  }

  async function markCancelled(deployment: Deployment) {
    await cancelledMutation.mutateAsync({
      params: { path: deploymentPath(deployment) },
    });
    invalidate();
  }

  async function markError() {
    if (!errorTarget) {
      return;
    }
    await errorMutation.mutateAsync({
      params: { path: deploymentPath(errorTarget) },
      body: { statusDetails: errorDetails },
    });
    setErrorTarget(undefined);
    setErrorDetails("");
    invalidate();
  }

  function confirmDelete(deployment: Deployment) {
    modal.confirm({
      title: t`Supprimer ce déploiement ?`,
      content: t`L'historique de ce déploiement sera perdu.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: deploymentPath(deployment) },
        });
        invalidate();
      },
    });
  }

  if (environments.length === 0 && !environmentsQuery.isLoading) {
    return (
      <Flex gap={16} vertical>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t`Déploiements`}
        </Typography.Title>
        <Empty description={t`Créez d'abord un environnement`} />
      </Flex>
    );
  }

  return (
    <Flex gap={16} vertical>
      <Flex align="center" gap={12} justify="space-between" wrap>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t`Déploiements`}
        </Typography.Title>
        <Space>
          <Select
            loading={environmentsQuery.isLoading}
            onChange={setEnvironmentId}
            options={environments.map((environment) => ({
              value: environment.id,
              label: environment.title,
            }))}
            style={{ minWidth: 200 }}
            value={selectedEnvironmentId}
          />
          <Button
            disabled={versions.length === 0}
            icon={<RocketOutlined />}
            onClick={() => setDeployOpen(true)}
            type="primary"
          >
            {t`Déployer une version`}
          </Button>
        </Space>
      </Flex>

      {deployments.length === 0 && !deploymentsQuery.isLoading ? (
        <Empty description={t`Aucun déploiement sur cet environnement`} />
      ) : (
        <Table<Deployment>
          columns={[
            {
              title: t`Version`,
              dataIndex: "applicationVersionId",
              render: (id: string) => <Tag>{versionLabels.get(id) ?? id}</Tag>,
            },
            {
              title: t`Statut`,
              dataIndex: "status",
              render: (status: Deployment["status"]) => (
                <DeploymentStatusTag status={status} />
              ),
            },
            {
              title: t`Détails`,
              dataIndex: "statusDetails",
              render: (details: string | null) => details || "—",
            },
            {
              title: t`Déployé par`,
              dataIndex: "ownerId",
              render: (ownerId: string) => users.name(ownerId),
            },
            {
              title: t`Démarré le`,
              dataIndex: "date",
              render: (value: string) =>
                dayjs(value).format("DD/MM/YYYY HH:mm"),
            },
            {
              title: "",
              key: "actions",
              align: "right",
              render: (_, deployment) => (
                <Space>
                  {deployment.status === "standby" ? (
                    <>
                      <Tooltip title={t`Marquer comme terminé`}>
                        <Button
                          icon={<CheckOutlined />}
                          onClick={() => markFinished(deployment)}
                          size="small"
                        />
                      </Tooltip>
                      <Tooltip title={t`Marquer en erreur`}>
                        <Button
                          icon={<WarningOutlined />}
                          onClick={() => setErrorTarget(deployment)}
                          size="small"
                        />
                      </Tooltip>
                      <Tooltip title={t`Annuler`}>
                        <Button
                          icon={<CloseOutlined />}
                          onClick={() => markCancelled(deployment)}
                          size="small"
                        />
                      </Tooltip>
                    </>
                  ) : null}
                  <Tooltip title={t`Supprimer`}>
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => confirmDelete(deployment)}
                      size="small"
                    />
                  </Tooltip>
                </Space>
              ),
            },
          ]}
          dataSource={deployments}
          loading={deploymentsQuery.isLoading}
          pagination={{ hideOnSinglePage: true, pageSize: 25 }}
          rowKey="id"
          size="small"
        />
      )}

      <Modal
        confirmLoading={deployMutation.isPending}
        destroyOnHidden
        okButtonProps={{ disabled: !versionId }}
        okText={t`Déployer`}
        onCancel={() => setDeployOpen(false)}
        onOk={deploy}
        open={deployOpen}
        title={t`Déployer une version`}
      >
        <Select
          loading={versionsQuery.isLoading}
          onChange={setVersionId}
          options={versions.map((version) => ({
            value: version.id,
            label: `${formatVersion(version.version)} — ${version.title}`,
          }))}
          placeholder={t`Choisir une version`}
          style={{ width: "100%" }}
          value={versionId}
        />
      </Modal>

      <Modal
        confirmLoading={errorMutation.isPending}
        destroyOnHidden
        okButtonProps={{ danger: true, disabled: !errorDetails.trim() }}
        okText={t`Marquer en erreur`}
        onCancel={() => setErrorTarget(undefined)}
        onOk={markError}
        open={!!errorTarget}
        title={t`Signaler une erreur de déploiement`}
      >
        <Input.TextArea
          onChange={(event) => setErrorDetails(event.target.value)}
          placeholder={t`Décrivez l'erreur rencontrée`}
          rows={4}
          value={errorDetails}
        />
      </Modal>
    </Flex>
  );
}
