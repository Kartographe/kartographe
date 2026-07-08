import { Trans, useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { Alert, Flex } from "antd";
import { useState } from "react";
import { z } from "zod";
import { $api } from "@/api/$api";
import { turnstileHeaders } from "@/api/turnstile";
import { AuthCard } from "@/features/auth/components/auth-card";
import { GoogleButton } from "@/features/auth/components/google-button";
import { TurnstileWidget } from "@/features/auth/components/turnstile-widget";
import { useAuthSuccess } from "@/features/auth/hooks/use-auth-success";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

export function LoginScreen() {
  const { t } = useLingui();
  const onAuthSuccess = useAuthSuccess();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loginMutation = $api.useMutation("post", "/auth/login", {
    meta: { noErrorToast: true },
  });

  const form = useAppForm({
    defaultValues: { email: "", password: "", rememberMe: false },
    validators: {
      onSubmit: z.object({
        email: z.email(t`Adresse email invalide`),
        password: z.string().min(1, t`Mot de passe requis`),
        rememberMe: z.boolean(),
      }),
    },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const data = await loginMutation.mutateAsync({
          body: value,
          headers: turnstileHeaders(turnstileToken),
        });
        onAuthSuccess(data, value.rememberMe);
      } catch (submitError) {
        if (!handleFormError(form, submitError)) {
          setError(t`Email ou mot de passe incorrect.`);
        }
      }
    },
  });

  const turnstileReady =
    !import.meta.env.VITE_TURNSTILE_SITE_KEY || turnstileToken !== null;

  return (
    <AuthCard
      footer={
        <Trans>
          Pas encore de compte ?{" "}
          <Link to="/auth/register">Créer un compte</Link>
        </Trans>
      }
      subtitle={t`Connectez-vous à votre espace Kartographe`}
      title={t`Connexion`}
    >
      <form.AppForm>
        <form.FormRoot>
          <Flex gap={12} vertical>
            {error ? <Alert message={error} showIcon type="error" /> : null}
            <form.AppField name="email">
              {(field) => (
                <field.TextField
                  autoComplete="email"
                  label={t`Email`}
                  placeholder="you@example.com"
                  type="email"
                />
              )}
            </form.AppField>
            <form.AppField name="password">
              {(field) => (
                <field.PasswordField
                  autoComplete="current-password"
                  label={t`Mot de passe`}
                />
              )}
            </form.AppField>
            <Flex justify="space-between">
              <form.AppField name="rememberMe">
                {(field) => (
                  <field.CheckboxField>{t`Se souvenir de moi`}</field.CheckboxField>
                )}
              </form.AppField>
              <Link to="/auth/forgot">{t`Mot de passe oublié ?`}</Link>
            </Flex>
            <TurnstileWidget onToken={setTurnstileToken} />
            <form.SubmitButton block disabled={!turnstileReady}>
              {t`Se connecter`}
            </form.SubmitButton>
            <GoogleButton onError={setError} />
          </Flex>
        </form.FormRoot>
      </form.AppForm>
    </AuthCard>
  );
}
