import { useLingui } from "@lingui/react/macro";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button, Flex } from "antd";
import { useEffect } from "react";
import { AuthCard } from "@/features/auth/components/auth-card";
import { useIntermediateStore } from "@/features/auth/stores/intermediate-store";

export function TwoFactorChoiceScreen() {
  const { t } = useLingui();
  const navigate = useNavigate();
  const token = useIntermediateStore((state) => state.token);
  const availableTypes = useIntermediateStore((state) => state.availableTypes);

  useEffect(() => {
    if (!token) {
      navigate({ to: "/auth/login" });
    }
  }, [token, navigate]);

  return (
    <AuthCard
      footer={<Link to="/auth/login">{t`Annuler`}</Link>}
      subtitle={t`Choisissez une méthode de vérification`}
      title={t`Vérification en deux étapes`}
    >
      <Flex gap={12} vertical>
        {availableTypes.includes("otp") ? (
          <Button block onClick={() => navigate({ to: "/auth/otp" })}>
            {t`Application d'authentification`}
          </Button>
        ) : null}
        {availableTypes.includes("recovery_code") ? (
          <Button block onClick={() => navigate({ to: "/auth/recovery" })}>
            {t`Code de récupération`}
          </Button>
        ) : null}
      </Flex>
    </AuthCard>
  );
}
