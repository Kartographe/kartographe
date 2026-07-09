import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  InboxOutlined,
  RocketOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Empty,
  Flex,
  Space,
  Table,
  Tooltip,
  Typography,
  Upload,
} from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import { useAccountUserMap } from "@/features/accounts/use-account-user-map";
import {
  FeatureFileStatusTag,
  FeatureFileTypeTag,
} from "@/features/features/feature-tags";
import { FeatureFileFormModal } from "@/features/features/files/feature-file-form-modal";
import { uploadFeatureFile } from "@/features/features/files/upload-feature-file";
import { formatFileSize } from "@/lib/format/file-size";

type FeatureFile = components["schemas"]["FeatureFileItem"];

const LIST_KEY = [
  "get",
  "/v1/accounts/{account_id}/features/{feature_id}/files",
];

export function FeatureFilesScreen({
  accountId,
  featureId,
}: {
  accountId: string;
  featureId: string;
}) {
  const { i18n, t } = useLingui();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const users = useAccountUserMap(accountId);
  const [editing, setEditing] = useState<FeatureFile | undefined>(undefined);

  const path = { account_id: accountId, feature_id: featureId };

  const filesQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/features/{feature_id}/files",
    { params: { path } }
  );
  const activateMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/features/{feature_id}/files/{feature_file_id}/activate",
    { meta: { successMessage: t`Fichier restauré` } }
  );
  const archiveMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/features/{feature_id}/files/{feature_file_id}/archive",
    { meta: { successMessage: t`Fichier archivé` } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/features/{feature_id}/files/{feature_file_id}",
    { meta: { successMessage: t`Fichier supprimé` } }
  );
  // Multipart, so not an `$api` mutation — see `uploadFeatureFile`.
  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      uploadFeatureFile({ accountId, featureId, file }),
    meta: { successMessage: t`Fichier déposé` },
  });

  const files = filesQuery.data?.items ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
  }

  async function upload(file: File) {
    await uploadMutation.mutateAsync(file);
    invalidate();
  }

  async function toggleStatus(file: FeatureFile) {
    const params = { path: { ...path, feature_file_id: file.id } };
    if (file.status === "archived") {
      await activateMutation.mutateAsync({ params });
    } else {
      await archiveMutation.mutateAsync({ params });
    }
    invalidate();
  }

  // The listing omits `downloadUrl` — only the single-file read mints one, and
  // it is time-limited, so it is fetched at the moment of the click.
  async function download(file: FeatureFile) {
    const data = await queryClient.fetchQuery(
      $api.queryOptions(
        "get",
        "/v1/accounts/{account_id}/features/{feature_id}/files/{feature_file_id}",
        { params: { path: { ...path, feature_file_id: file.id } } }
      )
    );
    const url = data.item.downloadUrl;
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    message.error(t`Ce fichier n'est pas téléchargeable.`);
  }

  function confirmDelete(file: FeatureFile) {
    modal.confirm({
      title: t`Supprimer ${file.name} ?`,
      content: t`Cette action est irréversible.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: { ...path, feature_file_id: file.id } },
        });
        invalidate();
      },
    });
  }

  const uploadButton = (
    <Upload
      beforeUpload={(file) => {
        upload(file);
        // Antd would otherwise POST the file itself, with its own request.
        return false;
      }}
      showUploadList={false}
    >
      <Button
        icon={<UploadOutlined />}
        loading={uploadMutation.isPending}
        type="primary"
      >
        {t`Déposer un fichier`}
      </Button>
    </Upload>
  );

  const formModal = (
    <FeatureFileFormModal
      accountId={accountId}
      featureId={featureId}
      file={editing}
      key={editing?.id ?? "none"}
      onClose={() => setEditing(undefined)}
    />
  );

  if (!filesQuery.isLoading && files.length === 0) {
    return (
      <Flex gap={16} vertical>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t`Fichiers`}
        </Typography.Title>
        <Empty
          description={t`Aucun fichier. Déposez une capture, une vidéo ou un document pour illustrer cette fonctionnalité.`}
        >
          {uploadButton}
        </Empty>
        {formModal}
      </Flex>
    );
  }

  return (
    <Flex gap={16} vertical>
      <Flex align="center" justify="space-between">
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t`Fichiers`}
        </Typography.Title>
        {uploadButton}
      </Flex>

      <Table<FeatureFile>
        columns={[
          {
            title: t`Nom`,
            key: "name",
            dataIndex: "name",
            render: (name: string) => (
              <Typography.Text strong>{name}</Typography.Text>
            ),
          },
          {
            title: t`Fichier`,
            key: "fileName",
            dataIndex: "fileName",
            render: (fileName: string) => (
              <Typography.Text code ellipsis>
                {fileName}
              </Typography.Text>
            ),
          },
          {
            title: t`Type`,
            key: "type",
            dataIndex: "type",
            render: (type: FeatureFile["type"]) => (
              <FeatureFileTypeTag type={type} />
            ),
          },
          {
            title: t`Statut`,
            key: "status",
            dataIndex: "status",
            render: (status: FeatureFile["status"]) => (
              <FeatureFileStatusTag status={status} />
            ),
          },
          {
            title: t`Taille`,
            key: "fileSize",
            dataIndex: "fileSize",
            render: (fileSize: number) => formatFileSize(fileSize, i18n.locale),
          },
          {
            title: t`Déposé par`,
            key: "ownerId",
            dataIndex: "ownerId",
            render: (ownerId: string) => users.name(ownerId),
          },
          {
            title: t`Déposé le`,
            key: "date",
            dataIndex: "date",
            render: (value: string | null) =>
              value ? dayjs(value).format("DD/MM/YYYY") : "—",
          },
          {
            title: "",
            key: "actions",
            align: "right",
            render: (_, file) => (
              <Space>
                <Tooltip title={t`Télécharger`}>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => download(file)}
                    size="small"
                  />
                </Tooltip>
                <Tooltip title={t`Modifier`}>
                  <Button
                    icon={<EditOutlined />}
                    onClick={() => setEditing(file)}
                    size="small"
                  />
                </Tooltip>
                <Tooltip
                  title={
                    file.status === "archived" ? t`Restaurer` : t`Archiver`
                  }
                >
                  <Button
                    icon={
                      file.status === "archived" ? (
                        <RocketOutlined />
                      ) : (
                        <InboxOutlined />
                      )
                    }
                    onClick={() => toggleStatus(file)}
                    size="small"
                  />
                </Tooltip>
                <Tooltip title={t`Supprimer`}>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => confirmDelete(file)}
                    size="small"
                  />
                </Tooltip>
              </Space>
            ),
          },
        ]}
        dataSource={files}
        loading={filesQuery.isLoading}
        pagination={false}
        rowKey="id"
        size="small"
      />

      {formModal}
    </Flex>
  );
}
