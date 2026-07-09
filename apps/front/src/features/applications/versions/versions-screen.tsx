import { PlusOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { App, Button, Empty, Flex, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import {
  ApplicationStatusTag,
  VersionTypeTag,
} from "@/features/applications/application-tags";
import { RowActions } from "@/features/applications/row-actions";
import { formatVersion } from "@/features/applications/version";
import { VersionFormModal } from "@/features/applications/versions/version-form-modal";

type Version = components["schemas"]["ApplicationVersionItem"];

const LIST_KEY = [
  "get",
  "/v1/accounts/{account_id}/applications/{application_id}/versions",
];

export function VersionsScreen({
  accountId,
  applicationId,
}: {
  accountId: string;
  applicationId: string;
}) {
  const { t } = useLingui();
  const { modal } = App.useApp();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Version | undefined>(undefined);

  const path = { account_id: accountId, application_id: applicationId };

  const versionsQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/applications/{application_id}/versions",
    { params: { path } }
  );
  const activateMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/applications/{application_id}/versions/{version_id}/activate",
    { meta: { successMessage: t`Version activée` } }
  );
  const archiveMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/applications/{application_id}/versions/{version_id}/archive",
    { meta: { successMessage: t`Version archivée` } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/applications/{application_id}/versions/{version_id}",
    { meta: { successMessage: t`Version supprimée` } }
  );

  const versions = versionsQuery.data?.items ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
  }

  async function toggleStatus(version: Version) {
    const params = { path: { ...path, version_id: version.id } };
    if (version.status === "archived") {
      await activateMutation.mutateAsync({ params });
    } else {
      await archiveMutation.mutateAsync({ params });
    }
    invalidate();
  }

  function confirmDelete(version: Version) {
    modal.confirm({
      title: t`Supprimer la version ${formatVersion(version.version)} ?`,
      content: t`Cette action est irréversible.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: { ...path, version_id: version.id } },
        });
        invalidate();
      },
    });
  }

  return (
    <Flex gap={16} vertical>
      <Flex align="center" justify="space-between">
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t`Versions`}
        </Typography.Title>
        <Button
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
          type="primary"
        >
          {t`Créer une version`}
        </Button>
      </Flex>

      {versions.length === 0 && !versionsQuery.isLoading ? (
        <Empty description={t`Aucune version`} />
      ) : (
        <Table<Version>
          columns={[
            {
              title: t`Version`,
              dataIndex: "version",
              render: (value: number[]) => <Tag>{formatVersion(value)}</Tag>,
            },
            {
              title: t`Titre`,
              dataIndex: "title",
              render: (title: string) => (
                <Typography.Text strong>{title}</Typography.Text>
              ),
            },
            {
              title: t`Type`,
              dataIndex: "type",
              render: (type: Version["type"]) => <VersionTypeTag type={type} />,
            },
            {
              title: t`Statut`,
              dataIndex: "status",
              render: (status: Version["status"]) => (
                <ApplicationStatusTag status={status} />
              ),
            },
            {
              title: t`Créée le`,
              dataIndex: "date",
              render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
            },
            {
              title: "",
              key: "actions",
              align: "right",
              render: (_, version) => (
                <RowActions
                  archived={version.status === "archived"}
                  onDelete={() => confirmDelete(version)}
                  onEdit={() => {
                    setEditing(version);
                    setFormOpen(true);
                  }}
                  onToggleStatus={() => toggleStatus(version)}
                />
              ),
            },
          ]}
          dataSource={versions}
          loading={versionsQuery.isLoading}
          pagination={{ hideOnSinglePage: true, pageSize: 25 }}
          rowKey="id"
          size="small"
        />
      )}

      <VersionFormModal
        accountId={accountId}
        applicationId={applicationId}
        key={editing?.id ?? "create"}
        onClose={() => setFormOpen(false)}
        open={formOpen}
        version={editing}
      />
    </Flex>
  );
}
