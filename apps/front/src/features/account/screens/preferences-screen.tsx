// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, Flex, Skeleton, Typography } from "antd";
import { z } from "zod";
import { $api } from "@/api/$api";
import { useCurrentUser } from "@/features/account/hooks/use-current-user";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";
import { useThemeStore } from "@/lib/theme/theme-store";

export function PreferencesScreen() {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const setThemeMode = useThemeStore((state) => state.setMode);
  const meQuery = useCurrentUser();

  const updateMutation = $api.useMutation("patch", "/me", {
    meta: { successMessage: t`Préférences mises à jour` },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["get", "/me"] }),
  });

  const me = meQuery.data?.item;

  const form = useAppForm({
    defaultValues: {
      language: me?.language ?? "fr-FR",
      theme: me?.theme ?? "system",
    },
    validators: {
      onSubmit: z.object({
        language: z.enum(["fr-FR", "en-GB", "es-ES", "de-DE", "it-IT"]),
        theme: z.enum(["system", "light", "dark"]),
      }),
    },
    onSubmit: async ({ value }) => {
      await updateMutation.mutateAsync({
        body: { language: value.language, theme: value.theme },
      });
      // Reflect the theme choice locally right away.
      setThemeMode(value.theme === "system" ? "auto" : value.theme);
    },
  });

  if (meQuery.isLoading) {
    return <Skeleton active paragraph={{ rows: 4 }} />;
  }
  if (meQuery.isError || !me) {
    return (
      <Alert
        message={t`Impossible de charger vos préférences.`}
        showIcon
        type="error"
      />
    );
  }

  return (
    <Flex gap={16} vertical>
      <Typography.Title level={3} style={{ margin: 0 }}>
        {t`Préférences`}
      </Typography.Title>
      <form.AppForm>
        <form.FormRoot>
          <Flex gap={12} vertical>
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
    </Flex>
  );
}
