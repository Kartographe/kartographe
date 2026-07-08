import { useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { Alert, Flex, Result } from "antd";
import { useState } from "react";
import { z } from "zod";
import { $api } from "@/api/$api";
import { turnstileHeaders } from "@/api/turnstile";
import { AuthCard } from "@/features/auth/components/auth-card";
import { TurnstileWidget } from "@/features/auth/components/turnstile-widget";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

interface ResetScreenProps {
  token?: string;
}

export function ResetScreen({ token }: ResetScreenProps) {
  const { t } = useLingui();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const resetMutation = $api.useMutation("post", "/auth/password/reset", {
    meta: { noErrorToast: true },
  });

  const form = useAppForm({
    defaultValues: { password: "", confirm: "" },
    validators: {
      onSubmit: z
        .object({
          password: z.string().min(8, t`Au moins 8 caractères`),
          confirm: z.string(),
        })
        .refine((data) => data.password === data.confirm, {
          message: t`Les mots de passe ne correspondent pas`,
          path: ["confirm"],
        }),
    },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        await resetMutation.mutateAsync({
          body: { token: token ?? "", password: value.password },
          headers: turnstileHeaders(turnstileToken),
        });
        setDone(true);
      } catch (submitError) {
        if (!handleFormError(form, submitError)) {
          setError(t`Ce lien est invalide ou a expiré.`);
        }
      }
    },
  });

  if (!token) {
    return (
      <AuthCard title={t`Lien invalide`}>
        <Alert
          message={t`Ce lien de réinitialisation est invalide ou incomplet.`}
          showIcon
          type="error"
        />
        <div className="mt-4 text-center">
          <Link to="/auth/forgot">{t`Demander un nouveau lien`}</Link>
        </div>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard title={t`Mot de passe modifié`}>
        <Result
          status="success"
          subTitle={t`Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.`}
          title={t`C'est fait`}
        />
        <div className="text-center">
          <Link to="/auth/login">{t`Se connecter`}</Link>
        </div>
      </AuthCard>
    );
  }

  const turnstileReady =
    !import.meta.env.VITE_TURNSTILE_SITE_KEY || turnstileToken !== null;

  return (
    <AuthCard
      subtitle={t`Choisissez un nouveau mot de passe`}
      title={t`Réinitialisation`}
    >
      <form.AppForm>
        <form.FormRoot>
          <Flex gap={12} vertical>
            {error ? <Alert message={error} showIcon type="error" /> : null}
            <form.AppField name="password">
              {(field) => (
                <field.PasswordField
                  autoComplete="new-password"
                  label={t`Nouveau mot de passe`}
                />
              )}
            </form.AppField>
            <form.AppField name="confirm">
              {(field) => (
                <field.PasswordField
                  autoComplete="new-password"
                  label={t`Confirmer le mot de passe`}
                />
              )}
            </form.AppField>
            <TurnstileWidget onToken={setTurnstileToken} />
            <form.SubmitButton block disabled={!turnstileReady}>
              {t`Réinitialiser`}
            </form.SubmitButton>
          </Flex>
        </form.FormRoot>
      </form.AppForm>
    </AuthCard>
  );
}
