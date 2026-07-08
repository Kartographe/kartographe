import { Trans, useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { Alert, Flex, Result } from "antd";
import { useState } from "react";
import { z } from "zod";
import { $api } from "@/api/$api";
import { turnstileHeaders } from "@/api/turnstile";
import { AuthCard } from "@/features/auth/components/auth-card";
import { TurnstileWidget } from "@/features/auth/components/turnstile-widget";
import { isTurnstileEnabled } from "@/features/auth/turnstile";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

export function RegisterScreen() {
  const { t } = useLingui();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const registerMutation = $api.useMutation("post", "/auth/register", {
    meta: { noErrorToast: true },
  });

  const form = useAppForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      gender: "unknown",
      acceptedTerms: false,
    },
    validators: {
      onSubmit: z.object({
        firstName: z.string().min(1, t`Prénom requis`),
        lastName: z.string().min(1, t`Nom requis`),
        email: z.email(t`Adresse email invalide`),
        password: z.string().min(8, t`Au moins 8 caractères`),
        gender: z.enum(["unknown", "male", "female"]),
        acceptedTerms: z.literal(true, {
          message: t`Vous devez accepter les conditions`,
        }),
      }),
    },
    onSubmit: async ({ value }) => {
      setError(null);
      if (isTurnstileEnabled() && !turnstileToken) {
        setError(t`Veuillez compléter la vérification de sécurité.`);
        return;
      }
      try {
        await registerMutation.mutateAsync({
          body: {
            firstName: value.firstName,
            lastName: value.lastName,
            email: value.email,
            password: value.password,
            gender: value.gender as "unknown" | "male" | "female",
            language: "fr-FR",
          },
          headers: turnstileHeaders(turnstileToken),
        });
        setSubmittedEmail(value.email);
      } catch (submitError) {
        if (!handleFormError(form, submitError)) {
          setError(t`Impossible de créer le compte. Réessayez.`);
        }
      }
    },
  });

  if (submittedEmail) {
    return (
      <AuthCard title={t`Vérifiez votre email`}>
        <Result
          status="success"
          subTitle={t`Un lien de confirmation a été envoyé à ${submittedEmail}. Ouvrez-le pour activer votre compte.`}
          title={t`Compte créé`}
        />
        <div className="text-center">
          <Link to="/auth/login">{t`Retour à la connexion`}</Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      footer={
        <Trans>
          Déjà un compte ? <Link to="/auth/login">Se connecter</Link>
        </Trans>
      }
      subtitle={t`Rejoignez Kartographe`}
      title={t`Créer un compte`}
    >
      <form.AppForm>
        <form.FormRoot>
          <Flex gap={12} vertical>
            {error ? <Alert message={error} showIcon type="error" /> : null}
            <Flex gap={12}>
              <div className="flex-1">
                <form.AppField name="firstName">
                  {(field) => (
                    <field.TextField
                      autoComplete="given-name"
                      label={t`Prénom`}
                    />
                  )}
                </form.AppField>
              </div>
              <div className="flex-1">
                <form.AppField name="lastName">
                  {(field) => (
                    <field.TextField
                      autoComplete="family-name"
                      label={t`Nom`}
                    />
                  )}
                </form.AppField>
              </div>
            </Flex>
            <form.AppField name="email">
              {(field) => (
                <field.TextField
                  autoComplete="email"
                  label={t`Email`}
                  type="email"
                />
              )}
            </form.AppField>
            <form.AppField name="gender">
              {(field) => (
                <field.SelectField
                  label={t`Civilité`}
                  options={[
                    { label: t`Non précisé`, value: "unknown" },
                    { label: t`Madame`, value: "female" },
                    { label: t`Monsieur`, value: "male" },
                  ]}
                />
              )}
            </form.AppField>
            <form.AppField name="password">
              {(field) => (
                <field.PasswordField
                  autoComplete="new-password"
                  label={t`Mot de passe`}
                />
              )}
            </form.AppField>
            <form.AppField name="acceptedTerms">
              {(field) => (
                <field.CheckboxField>
                  {t`J'accepte les conditions d'utilisation`}
                </field.CheckboxField>
              )}
            </form.AppField>
            <TurnstileWidget onToken={setTurnstileToken} />
            <form.SubmitButton block>{t`Créer mon compte`}</form.SubmitButton>
          </Flex>
        </form.FormRoot>
      </form.AppForm>
    </AuthCard>
  );
}
