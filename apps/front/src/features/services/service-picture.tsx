// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { AppstoreOutlined, CameraOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import type { UploadProps } from "antd";
import { App, Avatar, Button, Card, Flex, Typography, Upload } from "antd";
import ImgCrop from "antd-img-crop";
import { fetchClient } from "@/api/client";
import type { components } from "@/api/generated/schema";

type Service = components["schemas"]["ServiceItem"];

export function ServicePicture({
  accountId,
  service,
}: {
  accountId: string;
  service: Service;
}) {
  const { t } = useLingui();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  function invalidate() {
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/services"],
    });
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}/services/{service_id}"],
    });
  }

  const uploadPicture: UploadProps["customRequest"] = async ({
    file,
    onSuccess,
    onError,
  }) => {
    const formData = new FormData();
    formData.append("file", file as File);
    const { data, error } = await fetchClient.POST(
      "/v1/accounts/{account_id}/services/{service_id}/picture",
      {
        params: {
          path: { account_id: accountId, service_id: service.id },
        },
        body: formData as never,
        bodySerializer: (body) => body as never,
      }
    );
    if (error) {
      message.error(t`Impossible de mettre à jour l'image.`);
      onError?.(new Error("upload-failed"));
      return;
    }
    invalidate();
    message.success(t`Image mise à jour`);
    onSuccess?.(data);
  };

  return (
    <Card title={<Typography.Text strong>{t`Image`}</Typography.Text>}>
      <Flex align="center" gap={16}>
        <Avatar
          icon={<AppstoreOutlined />}
          shape="square"
          size={72}
          src={service.picturePath ?? undefined}
        />
        <ImgCrop
          aspect={1}
          modalCancel={t`Annuler`}
          modalOk={t`Enregistrer`}
          modalTitle={t`Recadrer l'image`}
          rotationSlider
          showReset
        >
          <Upload
            accept="image/*"
            customRequest={uploadPicture}
            disabled={service.locked}
            showUploadList={false}
          >
            <Button disabled={service.locked} icon={<CameraOutlined />}>
              {t`Changer l'image`}
            </Button>
          </Upload>
        </ImgCrop>
      </Flex>
    </Card>
  );
}
