import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Flex,
  Input,
  Modal,
  QRCode,
  Tag,
  Typography,
} from "antd";
import { useState } from "react";
import { $api } from "@/api/$api";
import { extractApiErrorDetail } from "@/api/error-messages";
import { RecoveryCodesModal } from "@/features/account/components/security/recovery-codes-modal";

interface OtpCardProps {
  otpEnabled: boolean;
}

interface Provisioning {
  id: string;
  secret: string;
  provisioningUri: string;
}

export function OtpCard({ otpEnabled }: OtpCardProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [setup, setSetup] = useState<Provisioning | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  const otpListQuery = $api.useQuery(
    "get",
    "/me/security/otp",
    {},
    { enabled: otpEnabled }
  );
  const generateMutation = $api.useMutation("post", "/me/security/otp");
  const activateMutation = $api.useMutation(
    "post",
    "/me/security/otp/{otp_id}/activate",
    { meta: { noErrorToast: true } }
  );
  const disableMutation = $api.useMutation(
    "delete",
    "/me/security/otp/{otp_id}",
    {
      meta: { successMessage: t`Authentificateur désactivé` },
    }
  );
  const regenerateMutation = $api.useMutation(
    "post",
    "/me/security/recovery-codes"
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["get", "/me/security"] });
    queryClient.invalidateQueries({ queryKey: ["get", "/me/security/otp"] });
  };

  async function startSetup() {
    const data = await generateMutation.mutateAsync({});
    setCode("");
    setCodeError(null);
    setSetup(data.item);
  }

  async function confirmSetup() {
    if (!setup) {
      return;
    }
    setCodeError(null);
    try {
      const data = await activateMutation.mutateAsync({
        params: { path: { otp_id: setup.id } },
        body: { code },
      });
      setSetup(null);
      setRecoveryCodes(data.item.codes);
      invalidate();
    } catch (error) {
      setCodeError(extractApiErrorDetail(error));
    }
  }

  async function disable(otpId: string) {
    await disableMutation.mutateAsync({ params: { path: { otp_id: otpId } } });
    invalidate();
  }

  async function regenerate() {
    const data = await regenerateMutation.mutateAsync({});
    setRecoveryCodes(data.item.codes);
    invalidate();
  }

  return (
    <Card
      title={
        <Flex align="center" gap={8}>
          <Typography.Text
            strong
          >{t`Application d'authentification`}</Typography.Text>
          {otpEnabled ? (
            <Tag color="green">{t`Activée`}</Tag>
          ) : (
            <Tag>{t`Désactivée`}</Tag>
          )}
        </Flex>
      }
    >
      <Flex gap={12} vertical>
        <Typography.Text type="secondary">
          {t`Utilisez une application comme Google Authenticator ou 1Password pour générer des codes à usage unique.`}
        </Typography.Text>

        {otpEnabled ? (
          <Flex gap={8} vertical>
            {otpListQuery.data?.items.map((otp) => (
              <Flex align="center" justify="space-between" key={otp.id}>
                <Typography.Text>{t`Authentificateur`}</Typography.Text>
                <Button
                  danger
                  loading={disableMutation.isPending}
                  onClick={() => disable(otp.id)}
                  size="small"
                >
                  {t`Désactiver`}
                </Button>
              </Flex>
            ))}
            <div>
              <Button
                loading={regenerateMutation.isPending}
                onClick={regenerate}
              >
                {t`Régénérer les codes de récupération`}
              </Button>
            </div>
          </Flex>
        ) : (
          <div>
            <Button
              loading={generateMutation.isPending}
              onClick={startSetup}
              type="primary"
            >
              {t`Activer`}
            </Button>
          </div>
        )}
      </Flex>

      <Modal
        confirmLoading={activateMutation.isPending}
        okButtonProps={{ disabled: code.length !== 6 }}
        okText={t`Valider`}
        onCancel={() => setSetup(null)}
        onOk={confirmSetup}
        open={setup !== null}
        title={t`Activer l'authentification à deux facteurs`}
      >
        {setup ? (
          <Flex align="center" gap={12} vertical>
            <Typography.Text>
              {t`Scannez ce QR code avec votre application d'authentification.`}
            </Typography.Text>
            <QRCode value={setup.provisioningUri} />
            <Typography.Text code copyable>
              {setup.secret}
            </Typography.Text>
            <Typography.Text>{t`Saisissez ensuite le code généré :`}</Typography.Text>
            <Input.OTP length={6} onChange={setCode} value={code} />
            {codeError ? (
              <Typography.Text type="danger">{codeError}</Typography.Text>
            ) : null}
          </Flex>
        ) : null}
      </Modal>

      <RecoveryCodesModal
        codes={recoveryCodes ?? []}
        onClose={() => setRecoveryCodes(null)}
        open={recoveryCodes !== null}
      />
    </Card>
  );
}
