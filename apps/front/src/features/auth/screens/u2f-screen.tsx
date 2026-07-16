// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { Link, useNavigate } from "@tanstack/react-router";
import { Alert, Button, Flex, Typography } from "antd";
import { useEffect, useRef, useState } from "react";
import { $api } from "@/api/$api";
import { extractApiErrorDetail } from "@/api/error-messages";
import { AuthCard } from "@/features/auth/components/auth-card";
import { useTwoFactorComplete } from "@/features/auth/hooks/use-two-factor-complete";
import { useIntermediateStore } from "@/features/auth/stores/intermediate-store";
import { getSecurityKeyAssertion } from "@/lib/webauthn/webauthn";

export function U2fScreen() {
  const { t } = useLingui();
  const navigate = useNavigate();
  const token = useIntermediateStore((state) => state.token);
  const complete = useTwoFactorComplete();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const completedRef = useRef(false);

  const optionsMutation = $api.useMutation(
    "post",
    "/auth/twoFactor/u2f/options"
  );
  const verifyMutation = $api.useMutation("post", "/auth/twoFactor/u2f", {
    meta: { noErrorToast: true },
  });

  useEffect(() => {
    if (!(token || completedRef.current)) {
      navigate({ to: "/auth/login" });
    }
  }, [token, navigate]);

  async function authenticate() {
    if (!token) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const optionsData = await optionsMutation.mutateAsync({
        body: { token },
      });
      const credential = await getSecurityKeyAssertion(
        optionsData.item.options as never
      );
      const data = await verifyMutation.mutateAsync({
        body: {
          assertionToken: optionsData.item.assertionToken,
          credential,
        },
      });
      completedRef.current = true;
      complete(data.item);
    } catch (assertError) {
      if (
        assertError instanceof DOMException &&
        assertError.name === "NotAllowedError"
      ) {
        // Prompt cancelled or timed out — let the user retry.
        return;
      }
      setError(extractApiErrorDetail(assertError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      footer={<Link to="/auth/2fa">{t`Utiliser une autre méthode`}</Link>}
      subtitle={t`Validez la connexion avec votre clé de sécurité`}
      title={t`Vérification en deux étapes`}
    >
      <Flex gap={12} vertical>
        {error ? <Alert message={error} showIcon type="error" /> : null}
        <Typography.Text type="secondary">
          {t`Insérez votre clé de sécurité puis suivez les instructions de votre navigateur.`}
        </Typography.Text>
        <Button block loading={busy} onClick={authenticate} type="primary">
          {t`Utiliser ma clé de sécurité`}
        </Button>
      </Flex>
    </AuthCard>
  );
}
