// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

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
  List,
  Space,
  Tooltip,
  Typography,
  Upload,
} from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import type { components } from "@/api/generated/schema";
import {
  StepFileStatusTag,
  StepFileTypeTag,
} from "@/features/journeys/journey-tags";
import { StepFileFormModal } from "@/features/journeys/steps/step-file-form-modal";
import { uploadStepFile } from "@/features/journeys/steps/upload-step-file";
import { formatFileSize } from "@/lib/format/file-size";

type StepFile = components["schemas"]["JourneyScenarioStepFileItem"];

const LIST_KEY = [
  "get",
  "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps/{step_id}/files",
];

export function StepFiles({
  accountId,
  journeyId,
  scenarioId,
  stepId,
}: {
  accountId: string;
  journeyId: string;
  scenarioId: string;
  stepId: string;
}) {
  const { i18n, t } = useLingui();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<StepFile | undefined>(undefined);

  const path = {
    account_id: accountId,
    journey_id: journeyId,
    scenario_id: scenarioId,
    step_id: stepId,
  };

  const filesQuery = $api.useQuery(
    "get",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps/{step_id}/files",
    { params: { path } }
  );
  const activateMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps/{step_id}/files/{step_file_id}/activate",
    { meta: { successMessage: t`Fichier restauré` } }
  );
  const archiveMutation = $api.useMutation(
    "post",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps/{step_id}/files/{step_file_id}/archive",
    { meta: { successMessage: t`Fichier archivé` } }
  );
  const deleteMutation = $api.useMutation(
    "delete",
    "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps/{step_id}/files/{step_file_id}",
    { meta: { successMessage: t`Fichier supprimé` } }
  );
  // Multipart, so not an `$api` mutation — see `uploadStepFile`.
  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      uploadStepFile({ accountId, journeyId, scenarioId, stepId, file }),
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

  async function toggleStatus(file: StepFile) {
    const params = { path: { ...path, step_file_id: file.id } };
    // A file is only ever `uploaded` or `archived` — no draft to activate from.
    if (file.status === "archived") {
      await activateMutation.mutateAsync({ params });
    } else {
      await archiveMutation.mutateAsync({ params });
    }
    invalidate();
  }

  // The listing omits `downloadUrl` — only the single-file read mints one, and
  // it is time-limited, so it is fetched at the moment of the click.
  async function download(file: StepFile) {
    const data = await queryClient.fetchQuery(
      $api.queryOptions(
        "get",
        "/v1/accounts/{account_id}/journeys/{journey_id}/scenarios/{scenario_id}/steps/{step_id}/files/{step_file_id}",
        { params: { path: { ...path, step_file_id: file.id } } }
      )
    );
    const url = data.item.downloadUrl;
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    message.error(t`Ce fichier n'est pas téléchargeable.`);
  }

  function confirmDelete(file: StepFile) {
    modal.confirm({
      title: t`Supprimer ${file.name} ?`,
      content: t`Cette action est irréversible.`,
      okText: t`Supprimer`,
      okButtonProps: { danger: true },
      cancelText: t`Annuler`,
      onOk: async () => {
        await deleteMutation.mutateAsync({
          params: { path: { ...path, step_file_id: file.id } },
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
        size="small"
      >
        {t`Déposer un fichier`}
      </Button>
    </Upload>
  );

  return (
    <Flex gap={12} vertical>
      <Flex align="center" justify="space-between">
        <Typography.Text strong>{t`Fichiers`}</Typography.Text>
        {uploadButton}
      </Flex>

      {files.length === 0 && !filesQuery.isLoading ? (
        <Empty
          description={t`Aucun fichier sur cette étape`}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <List
          dataSource={files}
          loading={filesQuery.isLoading}
          renderItem={(file) => (
            <List.Item
              actions={[
                <Tooltip key="download" title={t`Télécharger`}>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => download(file)}
                    size="small"
                  />
                </Tooltip>,
                <Tooltip key="edit" title={t`Modifier`}>
                  <Button
                    icon={<EditOutlined />}
                    onClick={() => setEditing(file)}
                    size="small"
                  />
                </Tooltip>,
                <Tooltip
                  key="status"
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
                </Tooltip>,
                <Tooltip key="delete" title={t`Supprimer`}>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => confirmDelete(file)}
                    size="small"
                  />
                </Tooltip>,
              ]}
            >
              <List.Item.Meta
                description={
                  <Typography.Text type="secondary">
                    {`${file.fileName} · ${formatFileSize(file.fileSize, i18n.locale)}`}
                  </Typography.Text>
                }
                title={
                  <Space>
                    {file.name}
                    <StepFileTypeTag type={file.type} />
                    <StepFileStatusTag status={file.status} />
                  </Space>
                }
              />
            </List.Item>
          )}
          size="small"
        />
      )}

      <StepFileFormModal
        accountId={accountId}
        file={editing}
        journeyId={journeyId}
        key={editing?.id ?? "none"}
        onClose={() => setEditing(undefined)}
        scenarioId={scenarioId}
        stepId={stepId}
      />
    </Flex>
  );
}
