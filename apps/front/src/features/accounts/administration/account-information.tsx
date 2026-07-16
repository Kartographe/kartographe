// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { CameraOutlined } from "@ant-design/icons";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import type { UploadProps } from "antd";
import { App, Button, Card, Flex, Spin, Typography, Upload } from "antd";
import ImgCrop from "antd-img-crop";
import { z } from "zod";
import { $api } from "@/api/$api";
import { fetchClient } from "@/api/client";
import { AccountAvatar } from "@/features/accounts/account-avatar";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

export function AccountInformation({ accountId }: { accountId: string }) {
  const { t } = useLingui();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const accountQuery = $api.useQuery("get", "/v1/accounts/{account_id}", {
    params: { path: { account_id: accountId } },
  });
  const account = accountQuery.data?.item;

  const updateMutation = $api.useMutation(
    "patch",
    "/v1/accounts/{account_id}",
    {
      meta: { successMessage: t`Compte mis à jour`, noErrorToast: true },
    }
  );

  function invalidate() {
    queryClient.invalidateQueries({
      queryKey: ["get", "/v1/accounts/{account_id}"],
    });
    queryClient.invalidateQueries({ queryKey: ["get", "/v1/accounts"] });
  }

  const uploadLogo: UploadProps["customRequest"] = async ({
    file,
    onSuccess,
    onError,
  }) => {
    const formData = new FormData();
    formData.append("file", file as File);
    const { data, error } = await fetchClient.POST(
      "/v1/accounts/{account_id}/picture",
      {
        params: { path: { account_id: accountId } },
        body: formData as never,
        bodySerializer: (body) => body as never,
      }
    );
    if (error) {
      message.error(t`Impossible de mettre à jour le logo.`);
      onError?.(new Error("upload-failed"));
      return;
    }
    invalidate();
    message.success(t`Logo mis à jour`);
    onSuccess?.(data);
  };

  const form = useAppForm({
    defaultValues: { name: account?.name ?? "" },
    validators: {
      onSubmit: z.object({ name: z.string().min(1, t`Le nom est requis`) }),
    },
    onSubmit: async ({ value, formApi }) => {
      try {
        await updateMutation.mutateAsync({
          params: { path: { account_id: accountId } },
          body: { name: value.name },
        });
        invalidate();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  if (accountQuery.isLoading || !account) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 200 }}>
        <Spin />
      </Flex>
    );
  }

  return (
    <Flex gap={24} vertical>
      <Typography.Title level={3} style={{ margin: 0 }}>
        {t`Informations`}
      </Typography.Title>

      <Card title={<Typography.Text strong>{t`Logo`}</Typography.Text>}>
        <Flex align="center" gap={16}>
          <AccountAvatar
            name={account.name}
            pictureProfile={account.pictureProfile}
            size={72}
          />
          <ImgCrop
            aspect={1}
            modalCancel={t`Annuler`}
            modalOk={t`Enregistrer`}
            modalTitle={t`Recadrer le logo`}
            rotationSlider
            showReset
          >
            <Upload
              accept="image/*"
              customRequest={uploadLogo}
              showUploadList={false}
            >
              <Button icon={<CameraOutlined />}>{t`Changer le logo`}</Button>
            </Upload>
          </ImgCrop>
        </Flex>
      </Card>

      <Card
        title={<Typography.Text strong>{t`Nom du compte`}</Typography.Text>}
      >
        <form.AppForm>
          <form.FormRoot>
            <form.AppField name="name">
              {(field) => <field.TextField label={t`Nom`} />}
            </form.AppField>
            <div>
              <form.SubmitButton>{t`Enregistrer`}</form.SubmitButton>
            </div>
          </form.FormRoot>
        </form.AppForm>
      </Card>
    </Flex>
  );
}
