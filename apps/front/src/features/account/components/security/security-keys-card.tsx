import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Card,
  Empty,
  Flex,
  Input,
  List,
  Modal,
  Typography,
} from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import { extractApiErrorDetail } from "@/api/error-messages";
import { createSecurityKeyCredential } from "@/lib/webauthn/webauthn";

export function SecurityKeysCard() {
  const { t } = useLingui();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [nicknameOpen, setNicknameOpen] = useState(false);
  const [nickname, setNickname] = useState("");
  const [registering, setRegistering] = useState(false);

  const keysQuery = $api.useQuery("get", "/me/security/u2f");
  const optionsMutation = $api.useMutation("post", "/me/security/u2f/options");
  const registerMutation = $api.useMutation("post", "/me/security/u2f", {
    meta: { noErrorToast: true },
  });
  const removeMutation = $api.useMutation(
    "delete",
    "/me/security/u2f/{u2f_id}",
    {
      meta: { successMessage: t`Clé supprimée` },
    }
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["get", "/me/security"] });
    queryClient.invalidateQueries({ queryKey: ["get", "/me/security/u2f"] });
  };

  async function register() {
    setRegistering(true);
    try {
      const optionsData = await optionsMutation.mutateAsync({});
      const credential = await createSecurityKeyCredential(
        optionsData.item.options as never
      );
      await registerMutation.mutateAsync({
        body: {
          registrationToken: optionsData.item.registrationToken,
          credential,
          nickname: nickname || undefined,
        },
      });
      message.success(t`Clé enregistrée`);
      setNicknameOpen(false);
      setNickname("");
      invalidate();
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        // User cancelled the browser prompt — no toast.
        return;
      }
      message.error(extractApiErrorDetail(error));
    } finally {
      setRegistering(false);
    }
  }

  async function remove(u2fId: string) {
    await removeMutation.mutateAsync({ params: { path: { u2f_id: u2fId } } });
    invalidate();
  }

  const keys = keysQuery.data?.items ?? [];

  return (
    <Card
      extra={
        <Button onClick={() => setNicknameOpen(true)} type="primary">
          {t`Ajouter une clé`}
        </Button>
      }
      title={<Typography.Text strong>{t`Clés de sécurité`}</Typography.Text>}
    >
      {keys.length === 0 ? (
        <Empty description={t`Aucune clé de sécurité enregistrée`} />
      ) : (
        <List
          dataSource={keys}
          renderItem={(key) => (
            <List.Item
              actions={[
                <Button
                  danger
                  key="remove"
                  onClick={() => remove(key.id)}
                  size="small"
                >
                  {t`Supprimer`}
                </Button>,
              ]}
            >
              <List.Item.Meta title={key.nickname || t`Clé de sécurité`} />
            </List.Item>
          )}
        />
      )}

      <Modal
        confirmLoading={registering}
        okText={t`Continuer`}
        onCancel={() => setNicknameOpen(false)}
        onOk={register}
        open={nicknameOpen}
        title={t`Ajouter une clé de sécurité`}
      >
        <Flex gap={12} vertical>
          <Typography.Text type="secondary">
            {t`Donnez un nom à cette clé, puis suivez les instructions de votre navigateur.`}
          </Typography.Text>
          <Input
            onChange={(event) => setNickname(event.target.value)}
            placeholder={t`Ex. YubiKey perso`}
            value={nickname}
          />
        </Flex>
      </Modal>
    </Card>
  );
}
