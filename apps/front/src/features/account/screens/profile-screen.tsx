import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, Divider, Flex, Skeleton, Typography } from "antd";
import { z } from "zod";
import { $api } from "@/api/$api";
import { ProfilePicture } from "@/features/account/components/profile-picture";
import { useCurrentUser } from "@/features/account/hooks/use-current-user";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

export function ProfileScreen() {
  const { t } = useLingui();
  const queryClient = useQueryClient();
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
    },
    validators: {
      onSubmit: z.object({
        firstName: z.string().min(1, t`Prénom requis`),
        lastName: z.string().min(1, t`Nom requis`),
        phone: z.string(),
        gender: z.enum(["unknown", "male", "female"]),
      }),
    },
    onSubmit: async ({ value }) => {
      await updateMutation.mutateAsync({
        body: {
          firstName: value.firstName,
          lastName: value.lastName,
          phone: value.phone || undefined,
          gender: value.gender,
        },
      });
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
        {t`Informations`}
      </Typography.Title>
      <ProfilePicture src={me.pictureProfile} />
      <Divider />
      <form.AppForm>
        <form.FormRoot>
          <Flex gap={12} vertical>
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
              {(field) => (
                <field.TextField
                  addonBefore="+33"
                  label={t`Téléphone`}
                  placeholder="6 12 34 56 78"
                  type="tel"
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
