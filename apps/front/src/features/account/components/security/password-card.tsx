import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Card, Flex, Typography } from "antd";
import { z } from "zod";
import { $api } from "@/api/$api";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

interface PasswordCardProps {
  hasPassword: boolean;
}

export function PasswordCard({ hasPassword }: PasswordCardProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();

  const createMutation = $api.useMutation("post", "/me/security/password", {
    meta: { successMessage: t`Mot de passe défini`, noErrorToast: true },
  });
  const updateMutation = $api.useMutation("patch", "/me/security/password", {
    meta: { successMessage: t`Mot de passe modifié`, noErrorToast: true },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["get", "/me/security"] });

  const form = useAppForm({
    defaultValues: { oldPassword: "", newPassword: "" },
    validators: {
      onSubmit: z.object({
        oldPassword: z.string(),
        newPassword: z.string().min(8, t`Au moins 8 caractères`),
      }),
    },
    onSubmit: async ({ value, formApi }) => {
      try {
        if (hasPassword) {
          await updateMutation.mutateAsync({
            body: {
              oldPassword: value.oldPassword,
              newPassword: value.newPassword,
            },
          });
        } else {
          await createMutation.mutateAsync({
            body: { password: value.newPassword },
          });
        }
        formApi.reset();
        invalidate();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  return (
    <Card
      title={
        <Flex vertical>
          <Typography.Text strong>{t`Mot de passe`}</Typography.Text>
          <Typography.Text type="secondary">
            {hasPassword
              ? t`Modifiez votre mot de passe`
              : t`Définissez un mot de passe pour votre compte`}
          </Typography.Text>
        </Flex>
      }
    >
      <form.AppForm>
        <form.FormRoot>
          <Flex gap={12} vertical>
            {hasPassword ? (
              <form.AppField name="oldPassword">
                {(field) => (
                  <field.PasswordField
                    autoComplete="current-password"
                    label={t`Mot de passe actuel`}
                  />
                )}
              </form.AppField>
            ) : null}
            <form.AppField name="newPassword">
              {(field) => (
                <field.PasswordField
                  autoComplete="new-password"
                  label={t`Nouveau mot de passe`}
                />
              )}
            </form.AppField>
            <div>
              <form.SubmitButton>
                {hasPassword ? t`Modifier` : t`Définir`}
              </form.SubmitButton>
            </div>
          </Flex>
        </form.FormRoot>
      </form.AppForm>
    </Card>
  );
}
