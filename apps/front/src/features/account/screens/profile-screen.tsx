import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, Card, Flex, Skeleton, Typography } from "antd";
import { z } from "zod";
import { $api } from "@/api/$api";
import { useCurrentUser } from "@/features/account/hooks/use-current-user";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";
import { useThemeStore } from "@/lib/theme/theme-store";

export function ProfileScreen() {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const setThemeMode = useThemeStore((state) => state.setMode);
  const meQuery = useCurrentUser();

  const updateMutation = $api.useMutation("patch", "/me", {
    meta: { successMessage: t`Profil mis à jour` },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["get", "/me"] }),
  });

  const me = meQuery.data?.item;

  const form = useAppForm({
    defaultValues: {
      firstName: me?.firstName ?? "",
      lastName: me?.lastName ?? "",
      phone: me?.phone ?? "",
      gender: me?.gender ?? "unknown",
      language: me?.language ?? "fr-FR",
      theme: me?.theme ?? "system",
    },
    validators: {
      onSubmit: z.object({
        firstName: z.string().min(1, t`Prénom requis`),
        lastName: z.string().min(1, t`Nom requis`),
        phone: z.string(),
        gender: z.enum(["unknown", "male", "female"]),
        language: z.enum(["fr-FR", "en-GB", "es-ES", "de-DE", "it-IT"]),
        theme: z.enum(["system", "light", "dark"]),
      }),
    },
    onSubmit: async ({ value }) => {
      await updateMutation.mutateAsync({
        body: {
          firstName: value.firstName,
          lastName: value.lastName,
          phone: value.phone || undefined,
          gender: value.gender,
          language: value.language,
          theme: value.theme,
        },
      });
      // Reflect the theme choice locally right away.
      setThemeMode(value.theme === "system" ? "auto" : value.theme);
    },
  });

  if (meQuery.isLoading) {
    return <Skeleton active paragraph={{ rows: 6 }} />;
  }
  if (meQuery.isError || !me) {
    return (
      <Alert
        message={t`Impossible de charger votre profil.`}
        showIcon
        type="error"
      />
    );
  }

  return (
    <Flex gap={16} vertical>
      <Typography.Title level={3} style={{ margin: 0 }}>
        {t`Mon profil`}
      </Typography.Title>
      <Card>
        <form.AppForm>
          <form.FormRoot>
            <Flex gap={12} vertical>
              <Flex gap={12}>
                <div className="flex-1">
                  <form.AppField name="firstName">
                    {(field) => <field.TextField label={t`Prénom`} />}
                  </form.AppField>
                </div>
                <div className="flex-1">
                  <form.AppField name="lastName">
                    {(field) => <field.TextField label={t`Nom`} />}
                  </form.AppField>
                </div>
              </Flex>
              <Typography.Text type="secondary">{me.email}</Typography.Text>
              <form.AppField name="phone">
                {(field) => <field.TextField label={t`Téléphone`} type="tel" />}
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
              <form.AppField name="language">
                {(field) => (
                  <field.SelectField
                    label={t`Langue`}
                    options={[
                      { label: "Français", value: "fr-FR" },
                      { label: "English", value: "en-GB" },
                      { label: "Español", value: "es-ES" },
                      { label: "Deutsch", value: "de-DE" },
                      { label: "Italiano", value: "it-IT" },
                    ]}
                  />
                )}
              </form.AppField>
              <form.AppField name="theme">
                {(field) => (
                  <field.SelectField
                    label={t`Thème`}
                    options={[
                      { label: t`Système`, value: "system" },
                      { label: t`Clair`, value: "light" },
                      { label: t`Sombre`, value: "dark" },
                    ]}
                  />
                )}
              </form.AppField>
              <div>
                <form.SubmitButton>{t`Enregistrer`}</form.SubmitButton>
              </div>
            </Flex>
          </form.FormRoot>
        </form.AppForm>
      </Card>
    </Flex>
  );
}
