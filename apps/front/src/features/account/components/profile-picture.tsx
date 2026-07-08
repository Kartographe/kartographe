import { CameraOutlined, UserOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import type { UploadProps } from "antd";
import { App, Avatar, Button, Flex, Upload } from "antd";
import ImgCrop from "antd-img-crop";
import { fetchClient } from "@/api/client";

interface ProfilePictureProps {
  src?: string | null;
}

export function ProfilePicture({ src }: ProfilePictureProps) {
  const { t } = useLingui();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const customRequest: UploadProps["customRequest"] = async ({
    file,
    onSuccess,
    onError,
  }) => {
    const formData = new FormData();
    formData.append("file", file as File);
    const { data, error } = await fetchClient.POST("/me/picture", {
      body: formData as never,
      bodySerializer: (body) => body as never,
    });
    if (error) {
      message.error(t`Impossible de mettre à jour la photo.`);
      onError?.(new Error("upload-failed"));
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["get", "/me"] });
    message.success(t`Photo de profil mise à jour`);
    onSuccess?.(data);
  };

  return (
    <Flex align="center" gap={16}>
      <Avatar icon={<UserOutlined />} size={72} src={src ?? undefined} />
      <ImgCrop
        aspect={1}
        cropShape="round"
        modalCancel={t`Annuler`}
        modalOk={t`Enregistrer`}
        modalTitle={t`Recadrer la photo`}
        rotationSlider
        showReset
      >
        <Upload
          accept="image/*"
          customRequest={customRequest}
          showUploadList={false}
        >
          <Button icon={<CameraOutlined />}>{t`Changer la photo`}</Button>
        </Upload>
      </ImgCrop>
    </Flex>
  );
}
