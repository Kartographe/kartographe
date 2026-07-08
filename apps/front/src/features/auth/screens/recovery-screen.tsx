import { useLingui } from "@lingui/react/macro";
import { Link, useNavigate } from "@tanstack/react-router";
import { Alert, Flex } from "antd";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { $api } from "@/api/$api";
import { AuthCard } from "@/features/auth/components/auth-card";
import { useTwoFactorComplete } from "@/features/auth/hooks/use-two-factor-complete";
import { useIntermediateStore } from "@/features/auth/stores/intermediate-store";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

export function RecoveryScreen() {
  const { t } = useLingui();
  const navigate = useNavigate();
  const token = useIntermediateStore((state) => state.token);
  const complete = useTwoFactorComplete();
  const [error, setError] = useState<string | null>(null);
  const completedRef = useRef(false);

  const recoveryMutation = $api.useMutation(
    "post",
    "/auth/twoFactor/recoveryCode",
    { meta: { noErrorToast: true } }
  );

  useEffect(() => {
    if (!(token || completedRef.current)) {
      navigate({ to: "/auth/login" });
    }
  }, [token, navigate]);

  const form = useAppForm({
    defaultValues: { value: "" },
    validators: {
      onSubmit: z.object({ value: z.string().min(1, t`Code requis`) }),
    },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const data = await recoveryMutation.mutateAsync({
          body: { token: token ?? "", value: value.value },
        });
        completedRef.current = true;
        complete(data.item);
      } catch {
        setError(t`Code de récupération invalide.`);
      }
    },
  });

  return (
    <AuthCard
      footer={<Link to="/auth/2fa">{t`Utiliser une autre méthode`}</Link>}
      subtitle={t`Saisissez l'un de vos codes de récupération`}
      title={t`Code de récupération`}
    >
      <form.AppForm>
        <form.FormRoot>
          <Flex gap={12} vertical>
            {error ? <Alert message={error} showIcon type="error" /> : null}
            <form.AppField name="value">
              {(field) => (
                <field.TextField label={t`Code`} placeholder="xxxx-xxxx-xxxx" />
              )}
            </form.AppField>
            <form.SubmitButton block>{t`Valider`}</form.SubmitButton>
          </Flex>
        </form.FormRoot>
      </form.AppForm>
    </AuthCard>
  );
}
