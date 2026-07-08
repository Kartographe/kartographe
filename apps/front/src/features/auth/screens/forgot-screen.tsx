import { useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { Alert, Flex, Result } from "antd";
import { useState } from "react";
import { z } from "zod";
import { $api } from "@/api/$api";
import { turnstileHeaders } from "@/api/turnstile";
import { AuthCard } from "@/features/auth/components/auth-card";
import { TurnstileWidget } from "@/features/auth/components/turnstile-widget";
import { isTurnstileEnabled } from "@/features/auth/turnstile";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

export function ForgotScreen() {
  const { t } = useLingui();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const forgotMutation = $api.useMutation("post", "/auth/password/forgot", {
    meta: { noErrorToast: true },
  });

  const form = useAppForm({
    defaultValues: { email: "" },
    validators: {
      onSubmit: z.object({ email: z.email(t`Adresse email invalide`) }),
    },
    onSubmit: async ({ value }) => {
      setError(null);
      if (isTurnstileEnabled() && !turnstileToken) {
        setError(t`Veuillez compléter la vérification de sécurité.`);
        return;
      }
      try {
        await forgotMutation.mutateAsync({
          body: value,
          headers: turnstileHeaders(turnstileToken),
        });
        setSent(true);
      } catch {
        setError(t`Une erreur est survenue. Réessayez.`);
      }
    },
  });

  if (sent) {
    return (
      <AuthCard title={t`Email envoyé`}>
        <Result
          status="success"
          subTitle={t`Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé.`}
          title={t`Vérifiez votre boîte mail`}
        />
        <div className="text-center">
          <Link to="/auth/login">{t`Retour à la connexion`}</Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      footer={<Link to="/auth/login">{t`Retour à la connexion`}</Link>}
      subtitle={t`Recevez un lien pour réinitialiser votre mot de passe`}
      title={t`Mot de passe oublié`}
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
                  type="email"
                />
              )}
            </form.AppField>
            <TurnstileWidget onToken={setTurnstileToken} />
            <form.SubmitButton block>{t`Envoyer le lien`}</form.SubmitButton>
          </Flex>
        </form.FormRoot>
      </form.AppForm>
    </AuthCard>
  );
}
