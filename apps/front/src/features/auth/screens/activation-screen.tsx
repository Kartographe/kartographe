import { useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { Flex, Result, Spin, Typography } from "antd";
import { useEffect, useRef, useState } from "react";
import { $api } from "@/api/$api";
import { turnstileHeaders } from "@/api/turnstile";
import { AuthCard } from "@/features/auth/components/auth-card";
import { TurnstileWidget } from "@/features/auth/components/turnstile-widget";
import { isTurnstileEnabled } from "@/features/auth/turnstile";

interface ActivationScreenProps {
  token?: string;
}

export function ActivationScreen({ token }: ActivationScreenProps) {
  const { t } = useLingui();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"pending" | "success" | "error">(
    "pending"
  );
  const startedRef = useRef(false);

  const activateMutation = $api.useMutation("post", "/auth/activate", {
    meta: { noErrorToast: true },
  });

  const turnstileReady = !isTurnstileEnabled() || turnstileToken !== null;

  useEffect(() => {
    if (startedRef.current || !token || !turnstileReady) {
      if (!token) {
        setStatus("error");
      }
      return;
    }
    startedRef.current = true;
    activateMutation
      .mutateAsync({
        body: { token },
        headers: turnstileHeaders(turnstileToken),
      })
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token, turnstileReady, turnstileToken, activateMutation]);

  return (
    <AuthCard title={t`Activation du compte`}>
      {status === "pending" ? (
        <Flex align="center" gap={16} style={{ padding: "8px 0" }} vertical>
          <Typography.Text style={{ textAlign: "center" }} type="secondary">
            {isTurnstileEnabled()
              ? t`Confirmez que vous n'êtes pas un robot pour activer votre compte.`
              : t`Activation de votre compte en cours…`}
          </Typography.Text>
          <TurnstileWidget onToken={setTurnstileToken} />
          <Spin />
        </Flex>
      ) : null}
      {status === "success" ? (
        <>
          <Result
            status="success"
            subTitle={t`Votre compte est actif. Vous pouvez maintenant vous connecter.`}
            title={t`Compte activé`}
          />
          <div className="text-center">
            <Link to="/auth/login">{t`Se connecter`}</Link>
          </div>
        </>
      ) : null}
      {status === "error" ? (
        <>
          <Result
            status="error"
            subTitle={t`Ce lien d'activation est invalide ou a expiré.`}
            title={t`Activation impossible`}
          />
          <div className="text-center">
            <Link to="/auth/login">{t`Retour à la connexion`}</Link>
          </div>
        </>
      ) : null}
    </AuthCard>
  );
}
