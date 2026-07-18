// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TableProps } from "antd";
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
import { actionsWidth, COL, scrollX } from "@/components/table/columns";
import { OwnerCell } from "@/features/accounts/owner-cell";
import {
  FeatureFileStatusTag,
  FeatureFileTypeTag,
} from "@/features/features/feature-tags";
import { FeatureFileFormModal } from "@/features/features/files/feature-file-form-modal";
import { fileIcon } from "@/features/features/files/file-icon";
import { uploadFeatureFile } from "@/features/features/files/upload-feature-file";
import { formatFileSize } from "@/lib/format/file-size";

type FeatureFile = components["schemas"]["FeatureFileItem"];
type FeatureFileType = components["schemas"]["FeatureFileType"];
type FeatureFileStatus = components["schemas"]["FeatureFileStatus"];

const LIST_KEY = [
  "get",
  "/v1/accounts/{account_id}/features/{feature_id}/files",
];

/** The « Fichier » cell stacks the name over its file name and size. */
const FILE_COL_WIDTH = 340;

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
  const typeMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}/features/{feature_id}/files/{feature_file_id}",
    { meta: { successMessage: t`Type mis à jour` } }
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

  // A file is only ever `uploaded` or `archived`: archiving and restoring go
  // through their own endpoints, driven here from the status dropdown.
  async function changeStatus(file: FeatureFile, status: FeatureFileStatus) {
    if (status === file.status) {
      return;
    }
    const params = { path: { ...path, feature_file_id: file.id } };
    if (status === "archived") {
      await archiveMutation.mutateAsync({ params });
    } else {
      await activateMutation.mutateAsync({ params });
    }
    invalidate();
  }

  async function changeType(file: FeatureFile, type: FeatureFileType) {
    await typeMutation.mutateAsync({
      params: { path: { ...path, feature_file_id: file.id } },
      body: { type },
    });
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

  const columns: TableProps<FeatureFile>["columns"] = [
    {
      title: t`Fichier`,
      key: "name",
      dataIndex: "name",
      width: FILE_COL_WIDTH,
      ellipsis: true,
      render: (name: string, file) => (
        <Flex align="center" gap={12} style={{ minWidth: 0 }}>
          <span
            aria-hidden
            style={{ color: "var(--ant-color-text-secondary)", fontSize: 22 }}
          >
            {fileIcon(file.fileExtension, file.type)}
          </span>
          <Flex style={{ minWidth: 0 }} vertical>
            <Typography.Text ellipsis strong>
              {name}
            </Typography.Text>
            <Typography.Text ellipsis style={{ fontSize: 12 }} type="secondary">
              {file.fileName} · {formatFileSize(file.fileSize, i18n.locale)}
            </Typography.Text>
          </Flex>
        </Flex>
      ),
    },
    {
      title: t`Type`,
      key: "type",
      dataIndex: "type",
      width: COL.type,
      render: (type: FeatureFile["type"], file) => (
        <FeatureFileTypeTag
          loading={typeMutation.isPending}
          onChange={(next) => changeType(file, next)}
          type={type}
        />
      ),
    },
    {
      title: t`Statut`,
      key: "status",
      dataIndex: "status",
      width: COL.status,
      render: (status: FeatureFile["status"], file) => (
        <FeatureFileStatusTag
          loading={activateMutation.isPending || archiveMutation.isPending}
          onChange={(next) => changeStatus(file, next)}
          status={status}
        />
      ),
    },
    {
      title: t`Dépôt`,
      key: "owner",
      dataIndex: "owner",
      width: COL.text,
      render: (_owner, file) => (
        <Flex style={{ minWidth: 0 }} vertical>
          <OwnerCell owner={file.owner} size={20} />
          <Typography.Text style={{ fontSize: 12 }} type="secondary">
            {file.date ? t`le ${dayjs(file.date).format("DD/MM/YYYY")}` : "—"}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: "",
      key: "actions",
      align: "right",
      fixed: "right",
      width: actionsWidth({ icons: 3 }),
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
  ];

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
        columns={columns}
        dataSource={files}
        loading={filesQuery.isLoading}
        pagination={false}
        rowKey="id"
        scroll={scrollX(columns)}
        size="small"
      />

      {formModal}
    </Flex>
  );
}
