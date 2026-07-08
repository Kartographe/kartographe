import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "antd";
import { z } from "zod";
import { $api } from "@/api/$api";
import { handleFormError } from "@/lib/tanstack/react-form/server-errors";
import { useAppForm } from "@/lib/tanstack/react-form/use-app-form";

interface CreateAccountModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateAccountModal({ open, onClose }: CreateAccountModalProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();

  const createMutation = $api.useMutation("post", "/v1/accounts", {
    meta: { successMessage: t`Compte créé`, noErrorToast: true },
  });

  const form = useAppForm({
    defaultValues: { name: "" },
    validators: {
      onSubmit: z.object({ name: z.string().min(1, t`Le nom est requis`) }),
    },
    onSubmit: async ({ value, formApi }) => {
      try {
        const timeZone =
          Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris";
        await createMutation.mutateAsync({
          body: { name: value.name, language: "fr-FR", timeZone },
        });
        queryClient.invalidateQueries({ queryKey: ["get", "/v1/accounts"] });
        formApi.reset();
        onClose();
      } catch (error) {
        handleFormError(formApi, error);
      }
    },
  });

  return (
    <Modal
      destroyOnHidden
      footer={null}
      onCancel={onClose}
      open={open}
      title={t`Créer un compte`}
    >
      <form.AppForm>
        <form.FormRoot>
          <form.AppField name="name">
            {(field) => (
              <field.TextField
                label={t`Nom du compte`}
                placeholder={t`Mon organisation`}
              />
            )}
          </form.AppField>
          <form.SubmitButton block>{t`Créer le compte`}</form.SubmitButton>
        </form.FormRoot>
      </form.AppForm>
    </Modal>
  );
}
